<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { signIn } from '~/utils/auth-client'

definePageMeta({
  layout: 'auth',
  meta: {
    public: true
  }
})

const { t } = useI18n()

useSeoMeta({
  title: t('login.title'),
  description: t('login.title')
})

const router = useRouter()
const route = useRoute()
const fields = computed(() => [{
  name: 'email',
  type: 'text' as const,
  label: t('login.fields.email'),
  placeholder: t('login.fields.emailPlaceholder'),
  required: true
}, {
  name: 'password',
  label: t('login.fields.password'),
  type: 'password' as const,
  placeholder: t('login.fields.passwordPlaceholder')
}, {
  name: 'remember',
  label: t('login.fields.remember'),
  type: 'checkbox' as const
}])

const providers = computed(() => [{
  label: t('login.providers.google'),
  icon: 'i-simple-icons-google',
  onClick: async () => {
    await handleGoogleLogin()
  }
}, {
  label: t('login.providers.github'),
  icon: 'i-simple-icons-github',
  onClick: async () => {
    await handleGitHubLogin()
  }
}])

const schema = computed(() => z.object({
  email: z.email(t('login.validation.invalidEmail')),
  password: z.string().min(8, t('login.validation.passwordMinLength'))
}))

const loading = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)
type Schema = {
  email: string
  password: string
  remember?: boolean
}

const onSubmit = async (payload: FormSubmitEvent<Schema>) => {
  console.log('Submitted', payload)

  loading.value = true
  try {
    await signIn.email(
      {
        email: payload.data.email,
        password: payload.data.password,
      },
      {
        onRequest: () => {
          loading.value = true
          errorMessage.value = null
        },
        onResponse: (_ctx) => {
          // Typically handled by onError or onSuccess
        },
        onSuccess: async (_ctx) => {
          // Check for pending invitation and accept it after successful login
          const pendingInvitationId = localStorage.getItem('pendingInvitationId')
          if (pendingInvitationId) {
            try {
              const { authClient } = await import('~/utils/auth-client')
              const result = await authClient.organization.acceptInvitation({
                invitationId: pendingInvitationId
              })
              if (result.error) {
                console.error('Failed to accept invitation after login:', result.error)
              } else {
                console.log('Invitation accepted successfully after login')
                localStorage.removeItem('pendingInvitationId')
              }
            } catch (err) {
              console.error('Error accepting invitation after login:', err)
            }
          }
          const redirectTo = route.query.redirect?.toString() || '/dashboard'
          window.location.href = redirectTo
        },
        onError: (ctx) => {
          const error = ctx.error
          console.error('Credentials login error:', error)

          // Check if the error indicates email needs verification
          if (error?.message?.includes('Email not verified')) {
            // Redirect to OTP verification page with login context
            const redirectTo = route.query.redirect?.toString() || '/dashboard'
            router.push(
              `/verify-email?email=${encodeURIComponent(payload.data.email)}&redirect=${encodeURIComponent(redirectTo)}&from=login`,
            )
          } else {
            errorMessage.value = error?.message || t('login.errors.invalidCredentials')
          }
          loading.value = false
        },
      },
    )
  } catch (error) {
    console.error('Unexpected login error:', error)
    errorMessage.value = t('login.errors.unexpectedError')
  } finally {
    loading.value = false
  }
}

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
    <UAlert v-if="successMessage" color="success" variant="soft" :description="successMessage" />
    <UAlert v-if="errorMessage" color="error" variant="soft" :description="errorMessage" />

    <!-- Company Logo -->
    <div class="flex justify-center mb-8">
      <AppLogo class="w-auto h-8 shrink-0" />
    </div>

    <UAuthForm :fields="fields" :schema="schema" :providers="providers" :title="t('login.title')" icon="i-lucide-lock"
      :loading="loading" @submit="onSubmit">
      <template #description>
        {{ t('login.description') }} <ULink to="/signup" class="text-primary font-medium">{{ t('login.signupLink') }}
        </ULink>.
      </template>

      <template #password-hint>
        <ULink to="/forgot-password" class="text-primary font-medium" tabindex="-1">{{
          t('login.forgotPassword') }}</ULink>
      </template>

      <template #footer>
        {{ t('login.footer') }} <ULink to="/" class="text-primary font-medium">{{ t('login.termsLink') }}</ULink>.
      </template>
    </UAuthForm>
  </div>
</template>
