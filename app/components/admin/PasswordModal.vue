<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { AdminUserResponse } from '#types'
import { authClient } from '~/utils/auth-client'

const props = defineProps<{
  user: AdminUserResponse | null
}>()

const emit = defineEmits<{
  success: []
  error: [message: string]
}>()

const open = defineModel<boolean>('open', { default: false })
const { t } = useI18n()
const toast = useToast()

// Password form schema
const passwordSchema = computed(() => z.object({
  newPassword: z.string().min(8, t('login.validation.passwordMinLength'))
}))

type PasswordSchema = z.output<typeof passwordSchema.value>

// Password form state
const passwordForm = reactive<PasswordSchema>({
  newPassword: ''
})

const handlePasswordSubmit = async (event: FormSubmitEvent<PasswordSchema>) => {
  if (!props.user) return

  try {
    const { error: passwordError } = await authClient.admin.setUserPassword({
      userId: props.user.id,
      newPassword: event.data.newPassword
    })

    if (passwordError) {
      throw passwordError
    }

    toast.add({
      title: t('common.success'),
      description: t('admin.user.password.success'),
      color: 'success'
    })
    open.value = false
    passwordForm.newPassword = ''
    emit('success')
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : t('admin.user.password.error')
    toast.add({
      title: t('common.error'),
      description: errorMessage,
      color: 'error'
    })
    emit('error', errorMessage)
  }
}
</script>

<template>
  <UModal v-model:open="open" :title="t('admin.user.password.title')" :ui="{ footer: 'justify-end' }">
    <template #body>
      <UForm :state="passwordForm" :schema="passwordSchema" class="space-y-4" @submit="handlePasswordSubmit">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          {{ t('admin.user.password.description') }}
        </p>

        <UFormField name="newPassword" :label="t('admin.user.password.newPassword')" required>
          <UInput
            v-model="passwordForm.newPassword"
            type="password"
            :placeholder="t('admin.user.password.newPasswordPlaceholder')"
            class="w-full"
          />
        </UFormField>

        <div class="flex gap-4 justify-end pt-4">
          <UButton type="button" variant="outline" @click="open = false">
            {{ t('common.cancel') }}
          </UButton>
          <UButton type="submit">
            {{ t('admin.user.password.confirm') }}
          </UButton>
        </div>
      </UForm>
    </template>
  </UModal>
</template>
