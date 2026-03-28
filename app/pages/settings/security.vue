<script setup lang="ts">
import * as z from 'zod'
import type { FormError, FormSubmitEvent } from '@nuxt/ui'
import { authClient } from '~/utils/auth-client'

const { t } = useI18n()
const toast = useToast()

const passwordSchema = z.object({
  currentPassword: z.string()
    .min(1, t('security.password.validation.currentPasswordRequired'))
    .min(8, t('login.validation.passwordMinLength')),
  newPassword: z.string()
    .min(1, t('security.password.validation.newPasswordRequired'))
    .min(8, t('login.validation.passwordMinLength'))
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: t('security.password.validation.passwordsMustBeDifferent'),
  path: ['newPassword']
})

type PasswordSchema = z.output<typeof passwordSchema>

const password = reactive<Partial<PasswordSchema>>({
  currentPassword: '',
  newPassword: ''
})

const userStore = useUserStore()
const { changePasswordAllowed } = storeToRefs(userStore)

const isLoading = ref(false)
const showDeleteModal = ref(false)

const validate = (state: Partial<PasswordSchema>): FormError[] => {
  const errors: FormError[] = []
  if (state.currentPassword && state.newPassword && state.currentPassword === state.newPassword) {
    errors.push({ name: 'newPassword', message: t('security.password.validation.passwordsMustBeDifferentShort') })
  }
  return errors
}

const handleSubmit = async (event: FormSubmitEvent<PasswordSchema>) => {
  if (!changePasswordAllowed.value) {
    return
  }

  isLoading.value = true

  try {
    const { error } = await authClient.changePassword({
      currentPassword: event.data.currentPassword,
      newPassword: event.data.newPassword,
      revokeOtherSessions: false // Keep other sessions active
    })

    if (error) {
      throw error
    }

    toast.add({
      title: t('common.success'),
      description: t('security.password.success'),
      color: 'success'
    })

    // Reset form
    password.currentPassword = ''
    password.newPassword = ''
  } catch (err: unknown) {
    let errorMessage = t('security.password.error')

    if (err instanceof Error) {
      errorMessage = err.message
    } else if (err && typeof err === 'object' && 'message' in err) {
      errorMessage = String(err.message)
    }

    toast.add({
      title: t('common.error'),
      description: errorMessage,
      color: 'error'
    })
  } finally {
    isLoading.value = false
  }
}

const isDeleteRequested = ref(false)
const handleDeleteSuccess = () => {
  // Account deletion handled in modal (redirects to home)
  showDeleteModal.value = false
  isDeleteRequested.value = true
}

const handleDeleteError = (message: string) => {
  // Error already shown in modal via toast
  console.error('Account deletion error:', message)
}
</script>

<template>
  <div>
  <AppCard v-if="changePasswordAllowed"
    :title="t('security.password.title')"
    :description="t('security.password.description')"
  >
    <UForm
      :schema="passwordSchema"
      :state="password"
      :validate="validate"
      class="flex flex-col gap-4 max-w-xs"
      @submit="handleSubmit"
    >
      <UFormField :name="'currentPassword'" :label="t('security.password.currentPassword')">
        <UInput
          v-model="password.currentPassword"
          type="password"
          :placeholder="t('security.password.currentPasswordPlaceholder')"
          class="w-full"
          :disabled="isLoading"
        />
      </UFormField>

      <UFormField :name="'newPassword'" :label="t('security.password.newPassword')">
        <UInput
          v-model="password.newPassword"
          type="password"
          :placeholder="t('security.password.newPasswordPlaceholder')"
          class="w-full"
          :disabled="isLoading"
        />
      </UFormField>

      <UButton
        :label="t('security.password.updateButton')"
        class="w-fit"
        type="submit"
        :loading="isLoading"
        :disabled="isLoading"
      />
    </UForm>
  </AppCard>

  <UCard
    :title="t('security.account.title')"
    :description="t('security.account.description')"
    class="bg-linear-to-tl from-error/10 from-5% to-default mt-8"
    variant="subtle"
  >
  <template #header>
      <div>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
          {{ t('security.account.title') }}
        </h2>
        <h6 class="text-sm text-gray-600 dark:text-gray-400">
          {{ t('security.account.description') }}
        </h6>
      </div>
    </template>
    <template #footer>
      <UButton
        :label="t('security.account.deleteButton')"
        :disabled="isDeleteRequested"
        color="error"
        @click="showDeleteModal = true"
      />
      </template>
      <UAlert v-if="isDeleteRequested" variant="outline" color="warning" :title="t('security.account.deleteRequested')" :description="t('security.account.deleteRequestedDescription')" />
    </UCard>

    <!-- Delete Account Modal -->
    <DeleteAccountModal
      v-if="showDeleteModal"
      v-model:open="showDeleteModal"
      :requires-password="changePasswordAllowed"
      @success="handleDeleteSuccess"
      @error="handleDeleteError"
    />
  </div>
</template>
