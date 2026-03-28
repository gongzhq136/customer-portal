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

// Ban form schema
const banSchema = computed(() => z.object({
  reason: z.string().optional(),
  expiresInDays: z.union([z.string(), z.number(), z.null(), z.undefined()]).transform((val) => {
    if (val === '' || val === null || val === undefined) return undefined
    const num = typeof val === 'string' ? parseInt(val, 10) : Number(val)
    return isNaN(num) ? undefined : num
  }).optional(),
  expiresInHours: z.union([z.string(), z.number(), z.null(), z.undefined()]).transform((val) => {
    if (val === '' || val === null || val === undefined) return undefined
    const num = typeof val === 'string' ? parseInt(val, 10) : Number(val)
    return isNaN(num) ? undefined : num
  }).optional(),
  expiresInMinutes: z.union([z.string(), z.number(), z.null(), z.undefined()]).transform((val) => {
    if (val === '' || val === null || val === undefined) return undefined
    const num = typeof val === 'string' ? parseInt(val, 10) : Number(val)
    return isNaN(num) ? undefined : num
  }).optional()
}))

type BanSchema = z.input<typeof banSchema.value>

// Ban form state
const banForm = reactive<BanSchema>({
  reason: '',
  expiresInDays: '',
  expiresInHours: '',
  expiresInMinutes: ''
})

const handleBanSubmit = async (event: FormSubmitEvent<z.output<typeof banSchema.value>>) => {
  if (!props.user) return

  // Prevent banning admin users (safety check)
  if (props.user.role === 'admin') {
    toast.add({
      title: t('common.error'),
      description: t('admin.user.ban.cannotBanAdmin'),
      color: 'error'
    })
    open.value = false
    return
  }

  try {
    let banExpiresIn: number | undefined
    const days = event.data.expiresInDays ?? 0
    const hours = event.data.expiresInHours ?? 0
    const minutes = event.data.expiresInMinutes ?? 0

    if (days > 0 || hours > 0 || minutes > 0) {
      banExpiresIn = (days * 24 * 60 * 60) + (hours * 60 * 60) + (minutes * 60)
    }

    const { error: banError } = await authClient.admin.banUser({
      userId: props.user.id,
      banReason: event.data.reason || undefined,
      banExpiresIn: banExpiresIn
    })

    if (banError) {
      throw banError
    }

    toast.add({
      title: t('common.success'),
      description: t('admin.user.ban.success'),
      color: 'success'
    })
    open.value = false
    emit('success')
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : t('admin.user.ban.error')
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
  <UModal v-model:open="open" :title="t('admin.user.ban.title')" :ui="{ footer: 'justify-end' }">
    <template #body>
      <UForm :state="banForm" :schema="banSchema" class="space-y-4" @submit="handleBanSubmit">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          {{ t('admin.user.ban.description') }}
        </p>

        <UFormField name="reason" :label="t('admin.user.ban.reason')">
          <UTextarea
            v-model="banForm.reason"
            :placeholder="t('admin.user.ban.reasonPlaceholder')"
            class="w-full"
          />
        </UFormField>

        <div>
          <label class="block text-sm font-medium mb-2">{{ t('admin.user.ban.expiresIn') }}</label>
          <div class="flex gap-2">
            <UFormField name="expiresInDays" class="flex-1">
              <UInput
                v-model="banForm.expiresInDays"
                type="number"
                :placeholder="t('admin.user.ban.expiresInDays')"
                min="0"
              />
            </UFormField>
            <UFormField name="expiresInHours" class="flex-1">
              <UInput
                v-model="banForm.expiresInHours"
                type="number"
                :placeholder="t('admin.user.ban.expiresInHours')"
                min="0"
              />
            </UFormField>
            <UFormField name="expiresInMinutes" class="flex-1">
              <UInput
                v-model="banForm.expiresInMinutes"
                type="number"
                :placeholder="t('admin.user.ban.expiresInMinutes')"
                min="0"
              />
            </UFormField>
          </div>
          <p class="text-xs text-gray-500 mt-1">
            {{ t('admin.user.ban.never') }} - Leave all fields empty
          </p>
        </div>

        <div class="flex gap-4 justify-end pt-4">
          <UButton type="button" variant="outline" @click="open = false">
            {{ t('common.cancel') }}
          </UButton>
          <UButton type="submit" color="error">
            {{ t('admin.user.ban.confirm') }}
          </UButton>
        </div>
      </UForm>
    </template>
  </UModal>
</template>
