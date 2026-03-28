<script setup lang="ts">
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

const impersonateUser = async () => {
  if (!props.user) return

  try {
    const { error: impersonateError } = await authClient.admin.impersonateUser({
      userId: props.user.id
    })

    if (impersonateError) {
      throw impersonateError
    }

    toast.add({
      title: t('common.success'),
      description: t('admin.user.impersonate.success'),
      color: 'success'
    })
    open.value = false
    emit('success')
    // Reload dashboard page
    window.location.href = '/dashboard'
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : t('admin.user.impersonate.error')
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
  <UModal v-model:open="open" :title="t('admin.user.impersonate.title')" :ui="{ footer: 'justify-end' }">
    <template #body>
      <div class="space-y-4">
        <UAlert color="warning" variant="soft" :title="t('admin.user.impersonate.warning')" />
        <p class="text-sm text-gray-600 dark:text-gray-400">
          {{ t('admin.user.impersonate.description') }}
        </p>
      </div>
    </template>

    <template #footer>
      <div class="flex gap-4 justify-end">
        <UButton variant="outline" @click="open = false">
          {{ t('common.cancel') }}
        </UButton>
        <UButton color="warning" @click="impersonateUser">
          {{ t('admin.user.impersonate.confirm') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
