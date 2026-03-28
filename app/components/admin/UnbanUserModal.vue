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

const unbanUser = async () => {
  if (!props.user) return

  try {
    const { error: unbanError } = await authClient.admin.unbanUser({
      userId: props.user.id
    })

    if (unbanError) {
      throw unbanError
    }

    toast.add({
      title: t('common.success'),
      description: t('admin.user.unban.success'),
      color: 'success'
    })
    open.value = false
    emit('success')
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : t('admin.user.unban.error')
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
  <UModal v-model:open="open" :title="t('admin.user.unban.title')" :ui="{ footer: 'justify-end' }">
    <template #body>
      <div class="space-y-4">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          {{ t('admin.user.unban.description') }}
        </p>
      </div>
    </template>

    <template #footer>
      <div class="flex gap-4 justify-end">
        <UButton variant="outline" @click="open = false">
          {{ t('common.cancel') }}
        </UButton>
        <UButton color="success" @click="unbanUser">
          {{ t('admin.user.unban.confirm') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
