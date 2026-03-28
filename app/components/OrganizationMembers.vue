<template>
  <div>
    <h1>Organization Members</h1>
  </div>
</template>
<!-- <script setup lang="ts">
import { authClient } from '~/utils/auth-client'
import type { OrganizationMemberWithUser, OrganizationInvitationsResponse, MemberRole, ApiError } from '#types'

const showInviteModal = defineModel<boolean>('showInviteModal', { required: false })
const members = ref<OrganizationMemberWithUser[]>([])
const invitations = ref<OrganizationInvitationsResponse>([])
const loading = ref(true)
const error = ref('')
const inviteEmail = ref('')
const inviteRole = ref<MemberRole>('member')
const inviting = ref(false)

const loadMembers = async () => {
  if (!organizationId.value) return

  try {
    loading.value = true
    const { data, error: membersError } = await authClient.organization.listMembers({
      query: { organizationId: organizationId.value }
    })
    if (membersError) throw membersError
    // Handle both array response and object response with members property
    if (Array.isArray(data)) {
      members.value = data as OrganizationMemberWithUser[]
    } else if (data?.members) {
      members.value = data.members as OrganizationMemberWithUser[]
    } else {
      members.value = []
    }
  } catch (err) {
    const apiError = err as ApiError
    error.value = apiError.message || 'Failed to load members'
  } finally {
    loading.value = false
  }
}

const loadInvitations = async () => {
  if (!organizationId.value) return

  try {
    // Better-auth doesn't have a direct list invitations endpoint,
    // so we'll need to create a custom API endpoint or fetch from the database
    // For now, we'll fetch from a custom endpoint
    const data = await $fetch<OrganizationInvitationsResponse>(`/api/organizations/${organizationId.value}/invitations`)
    invitations.value = data || []
  } catch (err) {
    const apiError = err as ApiError
    console.error('Failed to load invitations:', apiError)
    invitations.value = []
  }
}

const inviteMember = async () => {
  if (!organizationId.value) return

  try {
    inviting.value = true
    await authClient.organization.inviteMember({
      email: inviteEmail.value,
      organizationId: organizationId.value,
      role: inviteRole.value
    })
    showInviteModal.value = false
    inviteEmail.value = ''
    inviteRole.value = 'member'
    await loadInvitations()
    // Show success message - you might want to add a toast notification here
  } catch (err) {
    const apiError = err as ApiError
    error.value = apiError.message || 'Failed to send invitation'
  } finally {
    inviting.value = false
  }
}

const updateMemberRole = async (member: OrganizationMemberWithUser, newRole: MemberRole) => {
  try {
    await authClient.organization.updateMemberRole({
      memberId: member.id,
      organizationId: organizationId.value!,
      role: newRole
    })
    await loadMembers()
  } catch (err) {
    const apiError = err as ApiError
    error.value = apiError.message || 'Failed to update member role'
  }
}

const removeMember = async (member: OrganizationMemberWithUser) => {
  if (!confirm(`Remove ${member.user.email} from organization?`)) return

  try {
    await authClient.organization.removeMember({
      memberIdOrEmail: member.user.email,
      organizationId: organizationId.value!
    })
    await loadMembers()
  } catch (err) {
    const apiError = err as ApiError
    error.value = apiError.message || 'Failed to remove member'
  }
}

onMounted(() => {
  loadMembers()
  loadInvitations()
})
</script>

<template>
  <div class="organization-members">
    <div class="members-header">
      <h3>Organization Members</h3>
      <button class="btn-primary" @click="showInviteModal = true">
        Invite Member
      </button>
    </div>

    <div v-if="loading" class="loading">Loading members...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else class="members-list">
      <div v-for="member in members" :key="member.id" class="member-card">
        <div class="member-info">
          <div class="member-name">{{ member.user.name || member.user.email }}</div>
          <div class="member-email">{{ member.user.email }}</div>
          <div class="member-role">
            <UBadge
              :color="member.role === 'owner' ? 'primary' : member.role === 'admin' ? 'info' : 'neutral'"
              variant="soft"
            >
              {{ Array.isArray(member.role) ? member.role.join(', ') : member.role }}
            </UBadge>
          </div>
        </div>
        <div class="member-actions">
          <UDropdownMenu :items="[
            {
              label: 'Member',
              onClick: () => updateMemberRole(member, 'member')
            },
            {
              label: 'Admin',
              onClick: () => updateMemberRole(member, 'admin')
            },
            {
              label: 'Owner',
              onClick: () => updateMemberRole(member, 'owner')
            }
          ]">
            <UButton variant="outline" size="sm">
              Change Role
            </UButton>
          </UDropdownMenu>
          <UButton
            color="error"
            variant="outline"
            size="sm"
            @click="removeMember(member)"
          >
            Remove
          </UButton>
        </div>
      </div>
    </div>

    <div v-if="invitations.length > 0" class="mt-6">
      <h4 class="text-lg font-semibold mb-4">Pending Invitations</h4>
      <div class="space-y-2">
        <div
          v-for="invitation in invitations"
          :key="invitation.id"
          class="member-card"
        >
          <div class="member-info">
            <div class="member-email">{{ invitation.email }}</div>
            <div class="member-role">{{ invitation.role || 'member' }}</div>
            <div class="text-xs text-gray-500">
              Expires: {{ new Date(invitation.expiresAt).toLocaleDateString() }}
            </div>
          </div>
          <div class="member-actions">
            <UBadge color="warning" variant="soft">Pending</UBadge>
          </div>
        </div>
      </div>
    </div>

    <UModal v-model="showInviteModal" @close="showInviteModal = false">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">Invite Member</h3>
        </template>

        <form class="space-y-4" @submit.prevent="inviteMember">
          <UFormGroup label="Email" required>
            <UInput
              id="invite-email"
              v-model="inviteEmail"
              type="email"
              placeholder="user@example.com"
              required
            />
          </UFormGroup>

          <UFormGroup label="Role">
            <USelect
              v-model="inviteRole"
              :options="[
                { label: 'Member', value: 'member' },
                { label: 'Admin', value: 'admin' },
                { label: 'Owner', value: 'owner' }
              ]"
              option-attribute="label"
              value-attribute="value"
            />
          </UFormGroup>

          <UAlert
            v-if="error"
            color="error"
            variant="soft"
            :title="error"
          />

          <div class="flex gap-4 justify-end">
            <UButton
              type="button"
              variant="outline"
              @click="showInviteModal = false"
            >
              Cancel
            </UButton>
            <UButton
              type="submit"
              :disabled="inviting"
              :loading="inviting"
            >
              {{ inviting ? 'Sending...' : 'Send Invitation' }}
            </UButton>
          </div>
        </form>
      </UCard>
    </UModal>
  </div>
</template>

<style scoped>
.organization-members {
  padding: 1rem;
}

.members-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.member-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  margin-bottom: 0.5rem;
}

.member-info {
  flex: 1;
}

.member-name {
  font-weight: 500;
}

.member-email {
  color: #6b7280;
  font-size: 0.875rem;
}

.member-role {
  color: #3b82f6;
  font-size: 0.875rem;
}

.member-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}
</style> -->
