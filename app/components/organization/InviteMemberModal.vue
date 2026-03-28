<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { MemberRole } from '#types'
import { useOrganization } from '~/composables/useOrganization'

const props = defineProps<{
  organizationId: string
}>()

const emit = defineEmits<{
  success: []
  error: [message: string]
}>()

const open = defineModel<boolean>('open', { default: false })
const { t } = useI18n()
const toast = useToast()
const { inviteMember } = useOrganization()

const formSchema = computed(() => z.object({
  email: z.string().email(t('organization.members.validation.emailInvalid')),
  role: z.enum(['member', 'admin'], { required_error: t('organization.members.validation.roleRequired') })
}))

const form = reactive({
  email: '',
  role: 'member' as MemberRole
})

const inviting = ref(false)

const handleSubmit = async (event: FormSubmitEvent<z.output<typeof formSchema.value>>) => {
  try {
    inviting.value = true

    const result = await inviteMember(event.data.email, props.organizationId, event.data.role)

    if (result.error) {
      throw new Error(result.error.message || t('organization.members.errors.sendInvitationFailed'))
    }

    toast.add({
      title: t('common.success'),
      description: t('organization.members.invitations.sendSuccess'),
      color: 'success'
    })
    open.value = false
    emit('success')
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : t('organization.members.errors.sendInvitationFailed')
    toast.add({
      title: t('common.error'),
      description: errorMessage,
      color: 'error'
    })
    emit('error', errorMessage)
  } finally {
    inviting.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open" :title="t('organization.members.invitations.modalTitle')" :ui="{ footer: 'justify-end' }">
    <template #body>
      <UForm :state="form" :schema="formSchema" @submit="handleSubmit" class="space-y-4">
        <UFormField name="email" :label="t('organization.members.invitations.emailLabel')" required>
          <UInput
            v-model="form.email"
            type="email"
            :placeholder="t('organization.members.invitations.emailPlaceholder')"
            size="lg"
            class="w-full"
          />
        </UFormField>
        <UFormField name="role" :label="t('organization.members.invitations.roleLabel')" required>
          <USelect
            v-model="form.role"
            :options="[
              { label: t('organization.members.invitations.roleMember'), value: 'member' },
              { label: t('organization.members.invitations.roleAdmin'), value: 'admin' }
            ]"
            size="lg"
            class="w-full"
          />
        </UFormField>
        <div class="flex flex-col sm:flex-row gap-4 justify-end pt-4">
          <UButton
            type="button"
            variant="outline"
            @click="open = false"
            class="flex-1 sm:flex-none"
          >
            {{ t('organization.members.invitations.cancel') }}
          </UButton>
          <UButton
            type="submit"
            :loading="inviting"
            color="primary"
            class="flex-1 sm:flex-none"
          >
            {{ t('organization.members.invitations.sendButton') }}
          </UButton>
        </div>
      </UForm>
    </template>
  </UModal>
</template>

