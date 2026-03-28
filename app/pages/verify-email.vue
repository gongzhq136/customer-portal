<script setup lang="ts">
import { authClient } from '~/utils/auth-client'

const route = useRoute()
const { t } = useI18n()

const email = ref(decodeURIComponent(route.query.email as string || ''))
const otpCode = ref('')
const isLoading = ref(false)
const error = ref('')
const success = ref('')
const resendCooldown = ref(0)
let cooldownTimer: NodeJS.Timeout | null = null
const emailRef = ref<{ input: HTMLInputElement } | null>(null)
const invitationId = ref<string | null>(null)
const acceptingInvitation = ref(false)
onMounted(async () => {
  emailRef.value?.input?.focus()

  // Check for invitation ID in query params or localStorage
  const invIdFromQuery = route.query.invitationId as string | undefined
  const invIdFromStorage = process.client ? localStorage.getItem('pendingInvitationId') : null
  if (invIdFromQuery || invIdFromStorage) {
    invitationId.value = invIdFromQuery || invIdFromStorage || null
    if (process.client && invIdFromQuery) {
      localStorage.setItem('pendingInvitationId', invIdFromQuery)
    }
  }

  // Only auto-send OTP for login verification, not signup verification
  // Signup verification already sends an OTP during the signup process
  const isLoginVerification = route.query.redirect || route.query.from === 'login'
  if (email.value && isLoginVerification) {
    console.log('Login verification detected, sending OTP...')
    // Reset cooldown to ensure resendCode can run
    resendCooldown.value = 0
    await resendCode()
  } else if (email.value) {
    console.log('Signup verification detected, starting cooldown timer...')
    // For signup verification, start the cooldown timer since an OTP was already sent
    // This prevents immediate resend after page load
    startCooldownTimer()
  }
})

// Start cooldown timer
const startCooldownTimer = () => {
  resendCooldown.value = 60
  if (cooldownTimer) {
    clearInterval(cooldownTimer)
  }
  cooldownTimer = setInterval(() => {
    resendCooldown.value--
    if (resendCooldown.value <= 0) {
      clearInterval(cooldownTimer!)
      cooldownTimer = null
    }
  }, 1000)
}

// Clean up timer on unmount
onUnmounted(() => {
  if (cooldownTimer) {
    clearInterval(cooldownTimer)
  }
})
// Handle OTP input formatting (6 digits only)
const handleOtpInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  const value = target.value.replace(/\D/g, '').slice(0, 6)
  otpCode.value = value
  target.value = value
}

// Verify the OTP code
const verifyCode = async () => {
  if (otpCode.value.length !== 6) {
    error.value = t('verify.invalidCodeLength')
    return
  }

  isLoading.value = true
  error.value = ''
  success.value = ''

  try {
    // For users who are verifying during login, we need to sign them in
    // Check if this is a login verification (has redirect param) or signup verification
    const isLoginVerification = route.query.redirect || route.query.from === 'login'
    console.log('Verification context:', { isLoginVerification, email: email.value, redirect: route.query.redirect })

    let result
    if (isLoginVerification) {
      // For login verification, use signIn.emailOtp (sign-in type OTP)
      console.log('Using signIn.emailOtp for login verification')
      result = await authClient.signIn.emailOtp({
        email: email.value,
        otp: otpCode.value
      })
      console.log('signIn.emailOtp result:', result)
    } else {
      // For signup verification, use verifyEmail (email-verification type OTP)
      console.log('Using verifyEmail for signup verification')
      result = await authClient.emailOtp.verifyEmail({
        email: email.value,
        otp: otpCode.value
      })
      console.log('verifyEmail result:', result)
    }

    // Check for success - signIn.emailOtp returns user data, verifyEmail fallback returns status
    const isSuccess = result.data?.user || (result.data as unknown as { status: boolean })?.status === true

    console.log('Verification success check:', { isSuccess, hasUser: !!result.data?.user, hasStatus: !!(result.data as unknown as { status: boolean })?.status })

    if (isSuccess) {
      success.value = t('verify.success')
      console.log('Verification successful, checking session...')

      // For signup verification, the user might not be signed in yet
      // Don't try to accept invitation here - wait until after login
      if (!isLoginVerification) {
        console.log('Signup verification successful, user may need to sign in')
        // Keep invitation ID in localStorage for acceptance after login
        if (invitationId.value && process.client) {
          localStorage.setItem('pendingInvitationId', invitationId.value)
        }
        // Show a message and redirect to login
        const invitationMessage = invitationId.value ? ' After signing in, your invitation will be accepted automatically.' : ''
        success.value = t('verify.success') + invitationMessage + ' Please sign in to continue.'
        await new Promise(resolve => setTimeout(resolve, 2000))
        const redirectTo = route.query.redirect as string || '/dashboard'
        const loginPath = '/login'
        const fullPath = `${loginPath}?email=${encodeURIComponent(email.value)}&redirect=${encodeURIComponent(redirectTo)}`
        console.log('Redirecting to login:', fullPath)
        window.location.href = fullPath
        return
      }

      // For login verification, user should be signed in
      // Wait a moment for session to be established
      await new Promise(resolve => setTimeout(resolve, 500))

      // Check if session is established
      try {
        const sessionCheck = await authClient.getSession()
        console.log('Session after verification:', sessionCheck)
      } catch (sessionError) {
        console.log('Session check error:', sessionError)
      }

      // Accept invitation if present (user is now signed in)
      if (invitationId.value) {
        await acceptPendingInvitation()
      }

      console.log('Redirecting...')
      // The user should now be automatically signed in after email verification
      // Use window.location for a full page refresh to ensure session state is updated
      const redirectTo = route.query.redirect as string || '/dashboard'
      console.log('Redirecting to:', redirectTo)
      window.location.href = redirectTo
    } else {
      console.log('Verification failed:', result.error)
      error.value = result.error?.message as string || t('verify.invalidCode')
    }
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    error.value = errorMessage || t('verify.error')
  } finally {
    isLoading.value = false
  }
}

// Resend OTP code
const resendCode = async () => {
  console.log('resendCode called, cooldown:', resendCooldown.value)
  if (resendCooldown.value > 0) {
    console.log('Cooldown active, skipping resend')
    return
  }

  console.log('Starting resend process...')
  isLoading.value = true
  error.value = ''
  success.value = ''

  try {
    // Determine OTP type based on context
    const isLoginVerification = route.query.redirect || route.query.from === 'login'
    const otpType = isLoginVerification ? 'sign-in' : 'email-verification'

    await authClient.emailOtp.sendVerificationOtp({
      email: email.value,
      type: otpType
    }).then((result) => {
      if (result.data?.success) {
        success.value = t('verify.codeSent')
        // Start the cooldown timer after successful resend
        startCooldownTimer()
      } else {
        error.value = result.error?.message || t('verify.resendError')
      }
    })
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    error.value = errorMessage || t('verify.resendError')
  } finally {
    isLoading.value = false
  }
}

// Accept pending invitation
const acceptPendingInvitation = async () => {
  if (!invitationId.value) return

  acceptingInvitation.value = true
  try {
    console.log('Accepting invitation:', invitationId.value)
    const result = await authClient.organization.acceptInvitation({
      invitationId: invitationId.value
    })
    
    if (result.error) {
      console.error('Failed to accept invitation:', result.error)
      // Don't show error to user, just log it - they can accept manually later
    } else {
      console.log('Invitation accepted successfully')
      // Clear stored invitation ID
      if (process.client) {
        localStorage.removeItem('pendingInvitationId')
      }
    }
  } catch (err) {
    console.error('Error accepting invitation:', err)
  } finally {
    acceptingInvitation.value = false
  }
}

// Auto-submit when 6 digits are entered
watch(otpCode, (newValue) => {
  if (newValue.length === 6) {
    verifyCode()
  }
})

definePageMeta({
  layout: 'centerform',
  public: true,
})
</script>

<template>
  <CustomPageCard :title="$t('verify.title')" :description="$t('verify.subtitle', { email })" :success="success"
    :error="error">
    <!-- OTP Input -->
    <div class="flex flex-col items-center w-full">
      <UFormField name="otp" required class="w-full flex flex-col items-center" :label="t('verify.enterCode')">
        <UInput id="otp" v-model="otpCode" size="xl" type="text" maxlength="6" inputmode="numeric" pattern="[0-9]*"
          class="w-32 text-center" :placeholder="$t('verify.codePlaceholder')" :disabled="isLoading"
          @input="handleOtpInput" />
      </UFormField>
    </div>

    <!-- Resend Code -->
    <div class="text-center">
      <UButton :disabled="resendCooldown > 0 || isLoading" variant="ghost" size="sm" @click="resendCode">
        {{ resendCooldown > 0 ? t('verify.resendIn', { seconds: resendCooldown })
          : t('verify.resendCode') }}
      </UButton>
    </div>
  </CustomPageCard>
</template>
