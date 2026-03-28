<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { Organization, OrganizationInvitationsResponse, OrganizationMemberWithUser, ApiError, Invitation } from '#types'

const userStore = useUserStore()
const { myOrganizations, activeOrganizationId } = storeToRefs(userStore)
const { hasPermission } = userStore

const { t, locale } = useI18n()
const toast = useToast()

// Detect mobile breakpoint
const breakpoints = useBreakpoints({
  mobile: 768
})
const isMobile = breakpoints.smaller('mobile')

const loading = ref(true)
const error = ref('')
const organization = ref<Organization | null>(null)
const members = ref<OrganizationMemberWithUser[]>([])
const invitations = ref<OrganizationInvitationsResponse>([])
const showInviteModal = ref(false)
const showResendModal = ref(false)
const showDeleteModal = ref(false)
const showEditModal = ref(false)
const selectedInvitation = ref<{ id: string, email: string, role: string } | null>(null)
const deleteInvitationId = ref<string | null>(null)

// Type for organization with role
type OrganizationWithRole = Organization & { role?: string | null }

// Get user's role in this organization
const userOrganizationRole = computed(() => {
  if (!myOrganizations.value || !organization.value) return null
  const org = myOrganizations.value.find(org => org.id === organization.value?.id) as OrganizationWithRole | undefined
  return org?.role || null
})

// Load organization details
const loadOrganization = async () => {
  if (!activeOrganizationId.value) {
    loading.value = false
    organization.value = null
    members.value = []
    invitations.value = []
    return
  }
  try {
    loading.value = true
    error.value = ''
    organization.value = await $fetch<Organization>(`/api/organizations/${activeOrganizationId.value}`)

    if (organization.value) {
      await loadMembers()
      await loadInvitations()
    }
  } catch (err) {
    const apiError = err as ApiError
    error.value = apiError.message || t('admin.organization.detail.errors.loadFailed')
  } finally {
    loading.value = false
  }
}

// Load members
const loadMembers = async () => {
  if (!organization.value) return

  try {
    // Use admin API endpoint that bypasses membership check
    members.value = await $fetch<OrganizationMemberWithUser[]>(
      `/api/admin/organizations/${organization.value.id}/members`
    )
  } catch (err) {
    console.error('Failed to load members:', err)
    members.value = []
  }
}

// Load invitations
const loadInvitations = async () => {
  if (!organization.value) return

  try {
    // Use admin API endpoint that bypasses membership check
    invitations.value = await $fetch<OrganizationInvitationsResponse>(
      `/api/admin/organizations/${organization.value.id}/invitations`
    )
  } catch (err) {
    console.error('Failed to load invitations:', err)
    invitations.value = []
  }
}

// Handle invite success
const handleInviteSuccess = async () => {
  await loadInvitations()
}

// Open resend confirmation modal
const openResendModal = (invitationId: string, email: string, role: string) => {
  selectedInvitation.value = { id: invitationId, email, role }
  showResendModal.value = true
}

// Resend invitation (called after confirmation)
const handleResendInvitation = async () => {
  if (!organization.value || !selectedInvitation.value) return

  try {
    await $fetch(`/api/admin/organizations/${organization.value.id}/invitations/${selectedInvitation.value.id}/resend`, {
      method: 'POST'
    })
    await loadInvitations()
    toast.add({
      title: t('common.success'),
      description: t('admin.organization.detail.invitations.resendSuccess'),
      color: 'success'
    })
  } catch (err) {
    const apiError = err as ApiError
    error.value = apiError.message || t('admin.organization.detail.errors.resendFailed')
    toast.add({
      title: t('common.error'),
      description: apiError.message || t('admin.organization.detail.errors.resendFailed'),
      color: 'error'
    })
  } finally {
    selectedInvitation.value = null
  }
}

// Open delete confirmation modal
const openDeleteModal = (invitationId: string) => {
  deleteInvitationId.value = invitationId
  showDeleteModal.value = true
}

// Delete invitation (called after confirmation)
const handleDeleteInvitation = async () => {
  if (!organization.value || !deleteInvitationId.value) return

  try {
    await $fetch(`/api/admin/organizations/${organization.value.id}/invitations/${deleteInvitationId.value}/delete`)
    await loadInvitations()
    toast.add({
      title: t('common.success'),
      description: t('admin.organization.detail.invitations.deleteSuccess'),
      color: 'success'
    })
  } catch (err) {
    const apiError = err as ApiError
    error.value = apiError.message || t('admin.organization.detail.errors.cancelFailed')
    toast.add({
      title: t('common.error'),
      description: apiError.message || t('admin.organization.detail.errors.cancelFailed'),
      color: 'error'
    })
  } finally {
    deleteInvitationId.value = null
  }
}

const handleOrganizationUpdated = async () => {
  showEditModal.value = false
  await loadOrganization()
}

// Members table columns
const membersColumns = computed<TableColumn<OrganizationMemberWithUser>[]>(() => {
  // On mobile, only show Name and Role
  if (isMobile.value) {
    return [
      { accessorKey: 'name', header: t('admin.organization.detail.members.name') },
      { accessorKey: 'role', header: t('admin.organization.detail.members.role') }
    ]
  }
  // On desktop, show all columns
  return [
    { accessorKey: 'email', header: t('admin.organization.detail.members.email') },
    { accessorKey: 'name', header: t('admin.organization.detail.members.name') },
    { accessorKey: 'role', header: t('admin.organization.detail.members.role') }
  ]
})

// Invitations table columns
const invitationsColumns = computed<TableColumn<Invitation>[]>(() => {
  // On mobile, only show Email, Role, and Actions
  if (isMobile.value) {
    return [
      { accessorKey: 'email', header: t('admin.organization.detail.invitations.email') },
      { accessorKey: 'role', header: t('admin.organization.detail.invitations.role') },
      { accessorKey: 'actions', header: '' }
    ]
  }
  // On desktop, show all columns
  return [
    { accessorKey: 'email', header: t('admin.organization.detail.invitations.email') },
    { accessorKey: 'role', header: t('admin.organization.detail.invitations.role') },
    { accessorKey: 'status', header: t('admin.organization.detail.invitations.status') },
    { accessorKey: 'expiresAt', header: t('admin.organization.detail.invitations.expires') },
    { accessorKey: 'actions', header: t('admin.organization.detail.invitations.actions') }
  ]
})

watch(activeOrganizationId, (id) => {
  if (id) {
    void loadOrganization()
  } else {
    loading.value = false
    organization.value = null
    members.value = []
    invitations.value = []
  }
}, { immediate: true })

</script>

<template>
  <div>
    <!-- Loading State -->
    <div v-if="loading" class="text-center py-8">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin mx-auto" />
      <p class="text-gray-600 dark:text-gray-400 mt-2">
        {{ t('admin.organization.detail.loading') }}
      </p>
    </div>

    <!-- Error State -->
    <UAlert v-else-if="error" color="error" variant="soft" :title="error" />

    <!-- Organization Details -->
    <div v-else-if="organization && hasPermission('organization', 'read')" class="space-y-6">
      <!-- Organization Info Card -->
      <AppCard :title="t('admin.organization.detail.title')">
        <div class="space-y-2">
          <div>
            <span class="text-sm text-gray-600 dark:text-gray-400">{{ t('admin.organization.detail.name') }}</span>
            <div class="flex items-center gap-2">
              <p class="font-semibold">{{ organization.name }}</p>
              <UBadge v-if="userOrganizationRole"
                :color="userOrganizationRole === 'owner' ? 'primary' : userOrganizationRole === 'admin' ? 'info' : 'neutral'"
                variant="soft">
                {{ String(userOrganizationRole).charAt(0).toUpperCase() + String(userOrganizationRole).slice(1) }}
              </UBadge>
            </div>
          </div>
          <div>
            <span class="text-sm text-gray-600 dark:text-gray-400">{{ t('admin.organization.detail.slug') }}</span>
            <p class="font-mono text-sm">{{ organization.slug }}</p>
          </div>
          <div>
            <span class="text-sm text-gray-600 dark:text-gray-400">{{ t('admin.organization.detail.created') }}</span>
            <p>{{ new Date(organization.createdAt).toLocaleDateString() }}</p>
          </div>
          <div v-if="userOrganizationRole === 'owner'" class="pt-2">
            <UButton
              icon="i-lucide-pencil"
              color="primary"
              variant="outline"
              @click="showEditModal = true"
            >
              {{ t('organization.settings.editButton') }}
            </UButton>
          </div>
        </div>
      </AppCard>

      <!-- Members Card -->
      <UCard v-if="hasPermission('member', 'list')" :title="t('admin.organization.detail.members.title')" :description="t('admin.organization.detail.members.empty')">
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold">
              {{ t('admin.organization.detail.members.title') }} ({{ members.length }})
            </h2>
          </div>
        </template>
        <div v-if="members.length === 0" class="text-center py-8">
          <p class="text-gray-600 dark:text-gray-400">{{ t('admin.organization.detail.members.empty') }}</p>
        </div>
        <UTable v-else-if="members.length > 0" :data="members" :columns="membersColumns" :loading="loading">
          <template #email-cell="{ row }">
            {{ row.original.user.email }}
          </template>

          <template #name-cell="{ row }">
            {{ row.original.user.name || t('admin.table.notAvailable') }}
          </template>

          <template #role-cell="{ row }">
            <UBadge
              :color="row.original.role === 'owner' ? 'primary' : row.original.role === 'admin' ? 'info' : 'neutral'"
              variant="soft">
              {{ Array.isArray(row.original.role) ? row.original.role.join(', ') : row.original.role }}
            </UBadge>
          </template>
        </UTable>
      </UCard>

      <!-- Invitations Card -->
      <UCard v-if="hasPermission('invitation', 'list')">
        <template #header>
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h2 class="text-xl font-semibold">
              {{ t('admin.organization.detail.invitations.title') }} ({{
                invitations.length }})
            </h2>
            <UButton v-if="hasPermission('invitation', 'create')" icon="i-lucide-user-plus" color="primary" variant="outline"
              class="w-full sm:w-auto" @click="showInviteModal = true">
              {{ t('admin.organization.detail.invitations.inviteMember') }}
            </UButton>
          </div>
        </template>
        <div v-if="invitations.length === 0" class="text-center py-8">
          <p class="text-gray-600 dark:text-gray-400">{{ t('admin.organization.detail.invitations.empty') }}</p>
        </div>
        <UTable v-else-if="invitations.length > 0" :data="invitations" :columns="invitationsColumns" :loading="loading">
          <template #email-cell="{ row }">
            {{ row.original.email }}
          </template>

          <template #role-cell="{ row }">
            <UBadge color="primary" variant="soft">
              {{ row.original.role || 'member' }}
            </UBadge>
          </template>

          <template #status-cell="{ row }">
            <UBadge :color="row.original.status === 'pending' ? 'warning' : 'neutral'" variant="soft">
              {{ row.original.status }}
            </UBadge>
          </template>

          <template #expiresAt-cell="{ row }">
            <span class="text-sm text-gray-600 dark:text-gray-400">
              {{ new Date(row.original.expiresAt).toLocaleDateString(locale) }}
            </span>
          </template>

          <template #actions-cell="{ row }">
            <div class="flex gap-2">
              <UButton v-if="hasPermission('invitation', 'resend')" icon="i-lucide-send" variant="ghost" size="sm"
                @click="openResendModal(row.original.id, row.original.email, row.original.role || 'member')">
                {{ t('admin.organization.detail.invitations.resend') }}
              </UButton>
              <UButton v-if="hasPermission('invitation', 'delete')" icon="i-lucide-trash-2" variant="ghost" size="sm"
                color="error" @click="openDeleteModal(row.original.id)">
                {{ t('admin.organization.detail.invitations.delete') }}
              </UButton>
            </div>
          </template>
        </UTable>
      </UCard>
    </div>

    <!-- Invite Member Modal -->
    <AdminInviteMemberModal v-if="showInviteModal && organization" v-model:open="showInviteModal"
      :organization-id="organization.id" @success="handleInviteSuccess" />

    <UModal v-model:open="showEditModal" :title="t('organization.settings.editTitle')" :ui="{ footer: 'justify-end' }">
      <template #body>
        <OrganizationSettings @updated="handleOrganizationUpdated" @canceled="showEditModal = false" />
      </template>
    </UModal>

    <!-- Resend Invitation Confirmation Modal -->
    <ConfirmationModal v-if="showResendModal && selectedInvitation" v-model:open="showResendModal"
      title="admin.organization.detail.invitations.confirmResend.title"
      message="admin.organization.detail.invitations.confirmResend.message"
      :message-params="{ email: selectedInvitation.email, role: selectedInvitation.role }"
      confirm-text="admin.organization.detail.invitations.confirmResend.confirm" confirm-color="primary"
      @confirm="handleResendInvitation" />

    <!-- Delete Invitation Confirmation Modal -->
    <ConfirmationModal v-if="showDeleteModal" v-model:open="showDeleteModal"
      title="admin.organization.detail.invitations.confirmDelete.title"
      message="admin.organization.detail.invitations.confirmDelete.message"
      confirm-text="admin.organization.detail.invitations.confirmDelete.confirm" confirm-color="error"
      @confirm="handleDeleteInvitation" />
  </div>
</template>
