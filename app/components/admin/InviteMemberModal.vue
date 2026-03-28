<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { MemberRole } from '#types'

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

const formSchema = computed(() => z.object({
  email: z.string().email(t('organization.members.validation.emailInvalid')),
  role: z.enum(['owner', 'admin', 'member'], { required_error: t('admin.organization.detail.invitations.roleRequired') })
}))

const form = reactive({
  email: '',
  role: 'member' as MemberRole
})

const hasOwner = ref(false)
const checkingOwner = ref(false)

// Check if organization has an owner when modal opens
watch(open, async (isOpen) => {
  if (isOpen) {
    checkingOwner.value = true
    try {
      // Fetch members to check if organization has an owner
      const members = await $fetch<Array<{ role: string }>>(
        `/api/admin/organizations/${props.organizationId}/members`
      )
      hasOwner.value = members?.some(member => member.role === 'owner') || false

      // Set default role to 'owner' if no owner exists, otherwise 'member'
      form.role = hasOwner.value ? 'member' : 'owner'
    } catch (err) {
      console.error('Failed to check for owner:', err)
      // Default to 'member' if check fails
      form.role = 'member'
      hasOwner.value = true // Assume owner exists to be safe
    } finally {
      checkingOwner.value = false
    }
  } else {
    // Reset form when modal closes
    form.email = ''
    // Role will be set when modal opens again based on hasOwner check
  }
})

const roleOptions = computed(() => [
  { label: t('admin.organization.detail.invitations.roleOwner'), value: 'owner' },
  { label: t('admin.organization.detail.invitations.roleAdmin'), value: 'admin' },
  { label: t('admin.organization.detail.invitations.roleMember'), value: 'member' }
])

const inviting = ref(false)

const handleSubmit = async (event: FormSubmitEvent<z.output<typeof formSchema.value>>) => {
  try {
    inviting.value = true

    // Use server-side API endpoint for admins to bypass membership check
    const result = await $fetch(`/api/admin/organizations/${props.organizationId}/invitations`, {
      method: 'POST',
      body: {
        email: event.data.email,
        role: event.data.role
      }
    })

    if (!result) {
      throw new Error(t('admin.organization.detail.errors.sendInvitationFailed'))
    }

    toast.add({
      title: t('common.success'),
      description: t('admin.organization.detail.invitations.sendSuccess'),
      color: 'success'
    })
    open.value = false
    emit('success')
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : t('admin.organization.detail.errors.sendInvitationFailed')
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
  <UModal v-model:open="open" :title="t('admin.organization.detail.invitations.modalTitle')" :ui="{ footer: 'justify-end' }">
    <template #body>
      <UForm :state="form" :schema="formSchema" @submit="handleSubmit" class="space-y-4">
        <UFormField name="email" :label="t('admin.organization.detail.invitations.emailLabel')" required>
          <UInput
            v-model="form.email"
            type="email"
            :placeholder="t('admin.organization.detail.invitations.emailPlaceholder')"
            size="lg"
            class="w-full"
          />
        </UFormField>
        <UFormField name="role" :label="t('admin.organization.detail.invitations.roleLabel')" required>
          <USelect
            v-model="form.role"
            :items="roleOptions"
            value-key="value"
            size="lg"
            class="w-full"
          />
        </UFormField>
        <div class="flex gap-4 justify-end pt-4">
          <UButton
            type="button"
            variant="outline"
            @click="open = false"
          >
            {{ t('admin.organization.detail.invitations.cancel') }}
          </UButton>
          <UButton
            type="submit"
            :loading="inviting"
            color="primary"
          >
            {{ t('admin.organization.detail.invitations.sendButton') }}
          </UButton>
        </div>
      </UForm>
    </template>
  </UModal>
</template>
