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

// Update form schema
const updateSchema = computed(() => z.object({
  name: z.string().trim().min(1, t('profile.validation.nameRequired')).max(255, t('profile.validation.nameMaxLength')).optional(),
  image: z.union([
    z.string().url(t('profile.validation.imageInvalidUrl')),
    z.literal('').transform(() => null),
    z.null()
  ]).optional()
}).refine(
  (data) => data.name !== undefined || data.image !== undefined,
  {
    message: t('profile.validation.atLeastOneField')
  }
))

type UpdateSchema = z.output<typeof updateSchema.value>

// Update form state
const updateForm = reactive<Partial<UpdateSchema>>({
  name: '',
  image: ''
})

const handleUpdateSubmit = async (event: FormSubmitEvent<UpdateSchema>) => {
  if (!props.user) return

  try {
    const updateData: Record<string, unknown> = {}
    if (event.data.name) updateData.name = event.data.name.trim()
    if (event.data.image !== undefined) updateData.image = event.data.image || null

    const { error: updateError } = await authClient.admin.updateUser({
      userId: props.user.id,
      data: updateData
    })

    if (updateError) {
      throw updateError
    }

    toast.add({
      title: t('common.success'),
      description: t('admin.user.update.success'),
      color: 'success'
    })
    open.value = false
    emit('success')
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : t('admin.user.update.error')
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
  <UModal v-model:open="open" :title="t('admin.user.update.title')" :ui="{ footer: 'justify-end' }">
    <template #body>
      <UForm :state="updateForm" :schema="updateSchema" class="space-y-4" @submit="handleUpdateSubmit">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          {{ t('admin.user.update.description') }}
        </p>

        <UFormField name="name" :label="t('admin.user.update.name')">
          <UInput
            v-model="updateForm.name"
            :placeholder="t('admin.user.update.name')"
            class="w-full"
          />
        </UFormField>

        <UFormField name="image" :label="t('admin.user.update.image')">
          <UInput
            v-model="updateForm.image"
            :placeholder="t('admin.user.update.imagePlaceholder')"
            class="w-full"
          />
        </UFormField>

        <div class="flex gap-4 justify-end pt-4">
          <UButton type="button" variant="outline" @click="open = false">
            {{ t('common.cancel') }}
          </UButton>
          <UButton type="submit">
            {{ t('admin.user.update.confirm') }}
          </UButton>
        </div>
      </UForm>
    </template>
  </UModal>
</template>
