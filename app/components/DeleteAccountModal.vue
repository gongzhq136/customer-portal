<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { authClient } from '~/utils/auth-client'

const props = defineProps<{
  requiresPassword: boolean
}>()

const emit = defineEmits<{
  success: []
  error: [message: string]
}>()

const open = defineModel<boolean>('open', { default: false })
const { t } = useI18n()
const toast = useToast()

const isLoading = ref(false)

const passwordSchema = computed(() => {
  if (!props.requiresPassword) {
    return z.object({})
  }
  return z.object({
    password: z.string()
      .min(1, t('security.account.delete.passwordRequired'))
  })
})

type PasswordSchema = z.output<typeof passwordSchema.value>

const passwordForm = reactive({
  password: '' as string | undefined
})

const handleDelete = async (event?: FormSubmitEvent<PasswordSchema>) => {
  isLoading.value = true

  try {
    type DeleteParams = { password?: string, callbackURL?: string }
    const deleteParams: DeleteParams = {
      callbackURL: '/'
    }

    const hasPassword = props.requiresPassword && event?.data?.password
    if (hasPassword && event.data.password && typeof event.data.password === 'string') {
      deleteParams.password = event.data.password
    }

    const { error } = await authClient.deleteUser(deleteParams)

    if (error) {
      throw error
    }

    // No password - email verification was sent
    toast.add({
      title: t('common.success'),
      description: t('security.account.delete.emailVerificationSent'),
      color: 'success'
    })

    // Don't logout - user needs to click email link
    emit('success')
    open.value = false
    passwordForm.password = undefined
  } catch (err: unknown) {
    let errorMessage = t('security.account.delete.error')

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
    emit('error', errorMessage)
  } finally {
    isLoading.value = false
  }
}

const handleCancel = () => {
  open.value = false
  passwordForm.password = undefined
}
</script>

<template>
  <UModal v-model:open="open" :title="t('security.account.delete.confirmTitle')" :ui="{ footer: 'justify-end' }">
    <template #body>
      <div class="space-y-4">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          {{ t('security.account.delete.confirmMessage') }}
        </p>

        <UForm v-if="requiresPassword" :schema="passwordSchema" :state="passwordForm as unknown as PasswordSchema"
          class="space-y-4" @submit="handleDelete">
          <UFormField name="password" :label="t('security.account.delete.passwordRequired')">
            <UInput v-model="passwordForm.password" type="password"
              :placeholder="t('security.account.delete.passwordPlaceholder')" class="w-full" :disabled="isLoading" />
          </UFormField>

          <div class="flex gap-4 justify-end pt-4">
            <UButton type="button" variant="outline" :disabled="isLoading" @click="handleCancel">
              {{ t('security.account.delete.cancelButton') }}
            </UButton>
            <UButton type="submit" color="error" :loading="isLoading" :disabled="isLoading">
              {{ t('security.account.delete.deleteButton') }}
            </UButton>
          </div>
        </UForm>

        <div v-else class="flex gap-4 justify-end pt-4">
          <UButton type="button" variant="outline" :disabled="isLoading" @click="handleCancel">
            {{ t('security.account.delete.cancelButton') }}
          </UButton>
          <UButton type="button" color="error" :loading="isLoading" :disabled="isLoading" @click="handleDelete()">
            {{ t('security.account.delete.deleteButton') }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
