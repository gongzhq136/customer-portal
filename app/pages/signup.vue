<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { authClient } from '~/utils/auth-client'
import type { ApiError } from '~~/shared/types'

definePageMeta({
  layout: 'auth',
  public: true
})

const { t } = useI18n()

useSeoMeta({
  title: t('signup.title'),
  description: t('signup.title')
})

const toast = useToast()

const fields = computed(() => [{
  name: 'name',
  type: 'text' as const,
  label: t('signup.fields.name'),
  placeholder: t('signup.fields.namePlaceholder')
}, {
  name: 'email',
  type: 'text' as const,
  label: t('signup.fields.email'),
  placeholder: t('signup.fields.emailPlaceholder')
}, {
  name: 'password',
  label: t('signup.fields.password'),
  type: 'password' as const,
  placeholder: t('signup.fields.passwordPlaceholder')
}])

const providers = computed(() => [{
  label: t('signup.providers.google'),
  icon: 'i-simple-icons-google',
  onClick: async () => {
    await handleGoogleLogin()
  }
}, {
  label: t('signup.providers.github'),
  icon: 'i-simple-icons-github',
  onClick: async () => {
    await handleGitHubLogin()
  }
}])

const schema = computed(() => z.object({
  name: z.string().min(1, t('signup.validation.nameRequired')),
  email: z.email(t('signup.validation.invalidEmail')),
  password: z.string().min(8, t('signup.validation.passwordMinLength'))
}))

type Schema = {
  name: string
  email: string
  password: string
}

const route = useRoute()
const error = ref<string | null>(null)
const isLoading = ref(false)
const invitationId = ref<string | null>(null)
const invitationInfo = ref<{ organizationName?: string, role?: string, email?: string } | null>(null)
const acceptingInvitation = ref(false)

// User store for checking authentication
const userStore = useUserStore()
const { isAuthenticated, currentUser } = storeToRefs(userStore)

const fetchInvitationDetails = async (id: string) => {
  try {
    // Use custom endpoint to bypass inviter membership check
    const data = await $fetch<{
      organizationName?: string
      role?: string
      email?: string
    }>(`/api/organizations/get-invitation?id=${encodeURIComponent(id)}`)

    if (data) {
      invitationInfo.value = {
        organizationName: data.organizationName || undefined,
        role: data.role,
        email: data.email
      }
    }
  } catch (err) {
    console.error('Failed to fetch invitation details:', err)
  }
}

// Handle invitation acceptance for logged-in users
const handleLoggedInInvitation = async (invId: string) => {
  acceptingInvitation.value = true

  try {
    // Fetch invitation details using custom endpoint to bypass inviter membership check
    let invitationData: {
      email?: string
      role?: string
      organizationName?: string
      status?: string
      expiresAt?: Date | string
    } | null = null

    try {
      invitationData = await $fetch<{
        email?: string
        role?: string
        organizationName?: string
        status?: string
        expiresAt?: Date | string
      }>(`/api/organizations/get-invitation?id=${encodeURIComponent(invId)}`)
    } catch (fetchErr: unknown) {
      const apiError = fetchErr as { data?: { message?: string }, message?: string }
      const errorMessage = apiError?.data?.message || apiError?.message || t('signup.invitation.loggedIn.error', { error: 'Invitation not found' })
      error.value = errorMessage
      toast.add({
        title: t('common.error'),
        description: errorMessage,
        color: 'error'
      })
      acceptingInvitation.value = false
      return
    }

    if (!invitationData) {
      const errorMessage = t('signup.invitation.loggedIn.error', { error: 'Invitation not found' })
      error.value = errorMessage
      toast.add({
        title: t('common.error'),
        description: errorMessage,
        color: 'error'
      })
      acceptingInvitation.value = false
      return
    }

    // Check if invitation email matches logged-in user's email
    const userEmail = currentUser.value?.email?.toLowerCase()
    const invitationEmail = invitationData.email?.toLowerCase()

    if (userEmail !== invitationEmail) {
      const errorMessage = t('signup.invitation.loggedIn.emailMismatch')
      error.value = errorMessage
      toast.add({
        title: t('common.error'),
        description: errorMessage,
        color: 'error'
      })
      acceptingInvitation.value = false
      return
    }

    // Accept the invitation using custom endpoint to bypass inviter membership check
    // This is necessary because admins who create organizations are removed as members
    try {
      const result = await $fetch<{ success: boolean, organization?: { id: string, name: string } }>('/api/organizations/accept-invitation', {
        method: 'POST',
        body: { invitationId: invId }
      })

      if (!result || !result.success) {
        throw new Error('Failed to accept invitation')
      }

      // Set the organization as active if user doesn't have an active organization
      const userStore = useUserStore()
      if (!userStore.activeOrganizationId && result.organization) {
        await userStore.setActiveOrganizationId(result.organization.id)
      }
    } catch (err: unknown) {
      const apiError = err as { data?: { message?: string }, message?: string }
      const errorMessage = apiError?.data?.message || apiError?.message || t('signup.invitation.loggedIn.error', { error: 'Unknown error' })
      error.value = errorMessage
      toast.add({
        title: t('common.error'),
        description: errorMessage,
        color: 'error'
      })
      acceptingInvitation.value = false
      return
    }

    // Success - show success message and redirect
    const successMessage = t('signup.invitation.loggedIn.success', {
      organizationName: invitationData.organizationName || 'the organization',
      role: invitationData.role || 'member'
    })
    toast.add({
      title: t('common.success'),
      description: successMessage,
      color: 'success'
    })

    localStorage.removeItem('pendingInvitationId')

    // Redirect to dashboard after short delay
    await new Promise(resolve => setTimeout(resolve, 1500))
    await navigateTo('/dashboard')
  } catch (err) {
    console.error('Error handling logged-in invitation:', err)
    const errorMessage = t('signup.invitation.loggedIn.error', {
      error: err instanceof Error ? err.message : 'Unknown error'
    })
    error.value = errorMessage
    toast.add({
      title: t('common.error'),
      description: errorMessage,
      color: 'error'
    })
  } finally {
    acceptingInvitation.value = false
  }
}

const onSubmit = async (payload: FormSubmitEvent<Schema>) => {
  console.log('Submitted', payload)
  error.value = null
  isLoading.value = true

  // Store invitation ID if present
  const invId = route.query.invitationId as string | undefined
  if (invId) {
    localStorage.setItem('pendingInvitationId', invId)
  }

  try {
    const response = await authClient.signUp.email({
      name: payload.data.name,
      email: payload.data.email,
      password: payload.data.password
    })
    if (response.error) {
      const errorMessage = response.error.message || t('signup.errors.unknownError')
      error.value = errorMessage
      toast.add({ title: t('signup.errors.errorTitle'), description: errorMessage, color: 'error' })
    } else {
      // Redirect to OTP verification page with email parameter and invitation ID if present
      const verifyUrl = `/verify-email?email=${encodeURIComponent(payload.data.email)}${invId ? `&invitationId=${encodeURIComponent(invId)}` : ''}`
      navigateTo(verifyUrl)
    }
  } catch (err) {
    console.error('Email signup failed:', err)
    const apiError = err as ApiError
    const errorMessage = apiError.message || t('signup.errors.unknownError')
    error.value = errorMessage
    toast.add({ title: t('signup.errors.errorTitle'), description: errorMessage, color: 'error' })
  } finally {
    isLoading.value = false
  }
}
const invId = route.query.invitationId as string | undefined
if (invId) {
  invitationId.value = invId

  // Check if user is already logged in
  if (isAuthenticated.value && currentUser.value) {
    // User is logged in, try to accept invitation automatically
    await handleLoggedInInvitation(invId)
  } else {
    // User is not logged in, store for later use
    localStorage.setItem('pendingInvitationId', invId)
    // Try to fetch invitation details to show context
    fetchInvitationDetails(invId)
  }
}

const loading = ref(false)
const errorMessage = ref<string | null>(null)
const handleGitHubLogin = async () => {
  loading.value = true
  errorMessage.value = null
  try {
    const redirectTo = route.query.redirect?.toString() || '/dashboard'
    await signIn.social({ provider: 'github', callbackURL: redirectTo })
  } catch (error) {
    console.error('GitHub sign in initiation failed:', error)
    errorMessage.value = t('login.errors.githubError')
    loading.value = false
  }
}

const handleGoogleLogin = async () => {
  loading.value = true
  errorMessage.value = null
  try {
    const redirectTo = route.query.redirect?.toString() || '/dashboard'
    await signIn.social({ provider: 'google', callbackURL: redirectTo })
  } catch (error) {
    console.error('Google sign in initiation failed:', error)
    errorMessage.value = t('login.errors.googleError')
    loading.value = false
  }
}

</script>

<template>
  <div>
    <UAlert v-if="errorMessage" color="error" variant="soft" :description="errorMessage" />
    <!-- Company Logo -->
    <div class="flex justify-center mb-8">
      <AppLogo class="w-auto h-8 shrink-0" />
    </div>

    <UAuthForm :fields="fields" :schema="schema" :providers="providers" :title="t('signup.title')" :loading="loading"
      :submit="{ label: t('signup.submitButton') }" @submit="onSubmit">
      <template #description>
        {{ t('signup.description') }} <ULink to="/login" class="text-primary font-medium">{{ t('signup.loginLink') }}
        </ULink>.
      </template>

      <template #footer>
        {{ t('signup.footer') }} <ULink to="/" class="text-primary font-medium">{{ t('signup.termsLink') }}</ULink>.
      </template>
    </UAuthForm>
  </div>
</template>
