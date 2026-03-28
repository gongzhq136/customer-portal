<script setup lang="ts">
import type { SelectItem, TableColumn } from '@nuxt/ui'
import type { AdminUsersResponse, AdminUserResponse, UpdateUserRoleRequest, UpdateUserRoleResponse, ApiError, UserRole } from '#types'

const userStore = useUserStore()
const { isAdmin, currentUser } = storeToRefs(userStore)
const { t, locale } = useI18n()
const toast = useToast()

// Detect mobile breakpoint
const breakpoints = useBreakpoints({
  mobile: 768
})
const isMobile = breakpoints.smaller('mobile')

// Redirect if not admin
if (!isAdmin.value) {
  throw createError({ statusCode: 403, message: t('admin.errors.accessRequired') })
}

const loading = ref(true)
const error = ref('')
const users = ref<AdminUserResponse[]>([])
const searchQuery = ref('')
const editingUserId = ref<string | null>(null)
const editingRole = ref<UserRole>('user')
const updating = ref(false)

// Modal states
const showBanModal = ref(false)
const showUnbanModal = ref(false)
const showImpersonateModal = ref(false)
const showSessionsModal = ref(false)
const showPasswordModal = ref(false)
const showUpdateModal = ref(false)
const showEditRoleModal = ref(false)

// Selected user for operations
const selectedUser = ref<AdminUserResponse | null>(null)

const loadUsers = async () => {
  try {
    loading.value = true
    const params: Record<string, string> = {}
    if (searchQuery.value.trim()) {
      params.search = searchQuery.value.trim()
    }
    users.value = await $fetch<AdminUsersResponse>('/api/admin/users', {
      query: params
    })
  } catch (err) {
    const apiError = err as ApiError
    error.value = apiError.message || t('admin.errors.failedToLoadUsers')
  } finally {
    loading.value = false
  }
}

// Debounced search function
let searchTimeout: ReturnType<typeof setTimeout> | null = null
const handleSearch = () => {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  searchTimeout = setTimeout(() => {
    loadUsers()
  }, 300) // 300ms debounce
}

// Watch for search query changes to handle clearing
watch(searchQuery, (newValue) => {
  if (!newValue || newValue.trim() === '') {
    // Clear search immediately when input is cleared
    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }
    loadUsers()
  } else {
    handleSearch()
  }
})

// Cleanup timeout on unmount
onUnmounted(() => {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
})

await loadUsers()

const startEditRole = (user: AdminUserResponse) => {
  // Prevent editing current user's role
  if (currentUser.value && currentUser.value.id === user.id) {
    toast.add({
      title: t('common.error'),
      description: t('admin.errors.cannotChangeOwnRole'),
      color: 'error'
    })
    return
  }

  // On mobile, open modal instead of inline editing
  if (isMobile.value) {
    selectedUser.value = user
    editingRole.value = (user.role || 'user') as UserRole
    showEditRoleModal.value = true
    return
  }

  // On desktop, use inline editing
  editingUserId.value = user.id
  editingRole.value = (user.role || 'user') as UserRole
}

const cancelEdit = () => {
  editingUserId.value = null
}

const updateUserRole = async (userId: string) => {
  // Prevent changing current user's role (safety check)
  if (currentUser.value && currentUser.value.id === userId) {
    toast.add({
      title: t('common.error'),
      description: t('admin.errors.cannotChangeOwnRole'),
      color: 'error'
    })
    editingUserId.value = null
    showEditRoleModal.value = false
    return
  }

  try {
    updating.value = true
    await $fetch<UpdateUserRoleResponse>(`/api/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: { role: editingRole.value } satisfies UpdateUserRoleRequest
    })
    await loadUsers()
    editingUserId.value = null
    showEditRoleModal.value = false
    toast.add({
      title: t('common.success'),
      description: t('admin.user.updateRole.success'),
      color: 'success'
    })
  } catch (err) {
    const apiError = err as ApiError
    error.value = apiError.message || t('admin.errors.failedToUpdateRole')
    toast.add({
      title: t('common.error'),
      description: error.value,
      color: 'error'
    })
  } finally {
    updating.value = false
  }
}

// Ban user
const openBanModal = (user: AdminUserResponse) => {
  // Prevent banning admin users
  if (user.role === 'admin') {
    toast.add({
      title: t('common.error'),
      description: t('admin.user.ban.cannotBanAdmin'),
      color: 'error'
    })
    return
  }

  selectedUser.value = user
  showBanModal.value = true
}

const handleBanSuccess = async () => {
  await loadUsers()
}

// Unban user
const openUnbanModal = (user: AdminUserResponse) => {
  selectedUser.value = user
  showUnbanModal.value = true
}

const handleUnbanSuccess = async () => {
  await loadUsers()
}

// Impersonate user
const openImpersonateModal = (user: AdminUserResponse) => {
  selectedUser.value = user
  showImpersonateModal.value = true
}

// Sessions
const openSessionsModal = (user: AdminUserResponse) => {
  selectedUser.value = user
  showSessionsModal.value = true
}

// Change password
const openPasswordModal = (user: AdminUserResponse) => {
  selectedUser.value = user
  showPasswordModal.value = true
}

// Update user
const openUpdateModal = (user: AdminUserResponse) => {
  selectedUser.value = user
  showUpdateModal.value = true
}

const handleUpdateSuccess = async () => {
  await loadUsers()
}

const roles = computed<SelectItem[]>(() => [
  {
    label: t('admin.user.roles.user'),
    value: 'user'
  },
  {
    label: t('admin.user.roles.admin'),
    value: 'admin'
  }
])

const columns = computed<TableColumn<AdminUserResponse>[]>(() => {
  // On mobile, only show Name, Role, and Actions
  if (isMobile.value) {
    return [
      { accessorKey: 'name', header: t('admin.user.list.name') },
      { accessorKey: 'role', header: t('admin.user.list.role') },
      { accessorKey: 'actions', header: '' }
    ]
  }
  // On desktop, show all columns
  return [
    { accessorKey: 'name', header: t('admin.user.list.name') },
    { accessorKey: 'email', header: t('admin.user.list.email') },
    { accessorKey: 'role', header: t('admin.user.list.role') },
    { accessorKey: 'banned', header: t('admin.user.status.banned') },
    { accessorKey: 'emailVerified', header: t('admin.user.list.verified') },
    { accessorKey: 'createdAt', header: t('admin.user.list.created') },
    { accessorKey: 'actions', header: t('admin.user.list.actions') }
  ]
})

const canCreate = ref(true)
const startCreate = () => {
  console.log('startCreate')
}
const showFiltersModal = ref(false)
const showSortModal = ref(false)
const sortBy = ref<'name' | 'email' | 'createdAt'>('name')
const sortDir = ref<'asc' | 'desc'>('asc')
const currentSortLabel = computed(() => {
  return sortOptions.value.find(option => option.value === sortBy.value)?.label || t('common.sort')
})
const sortOptions = computed(() => [
  { label: t('admin.user.list.name'), value: 'name' as const },
  { label: t('admin.user.list.email'), value: 'email' as const },
  { label: t('admin.user.list.created'), value: 'createdAt' as const }
])
const sortDropdownItems = computed(() => {
  return sortOptions.value.map(option => ({
    label: option.label,
    icon: sortBy.value === option.value ? 'i-lucide-check' : undefined,
    onSelect: () => {
      sortBy.value = option.value
    }
  }))
})
const toggleSortDir = () => {
  sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
}

</script>

<template>
  <div>
    <UDashboardPanel>
      <template #header>
        <UDashboardNavbar :ui="{ right: 'gap-3' }" :toggle="false">
          <template #leading>
            <UIcon name="i-lucide-users" class="size-6 shrink-0" />
            <span class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ t('admin.user.list.title') }}
            </span>
          </template>

          <template #right>
            <div class="flex gap-2 w-full sm:w-auto">
              <UButton icon="i-lucide-plus" color="primary" class="flex-1 sm:flex-none" :title="t('admin.user.list.createButton')"
                :disabled="!canCreate" @click="startCreate" />
              <UButton icon="i-lucide-refresh-cw" variant="outline" :loading="loading" class="flex-1 sm:flex-none"
                :title="t('common.refresh')" @click="loadUsers" />
            </div>
          </template>
        </UDashboardNavbar>

        <UDashboardToolbar>
          <template #left>
            <div class="flex items-center gap-2 w-full">
              <UInput v-model="searchQuery" :placeholder="t('common.searchPlaceholder')" icon="i-lucide-search"
                :loading="loading" class="flex-1 max-w-md" clearable />
            </div>
          </template>
          <template #right>
            <div class="flex items-center gap-2">
              <UButton v-if="isMobile" icon="i-lucide-filter" variant="outline" @click="showFiltersModal = true">
                Filters
              </UButton>
              <UButton v-if="isMobile" icon="i-lucide-arrow-down-up" variant="outline" :title="t('common.sort')"
                @click="showSortModal = true">
                {{ t('common.sort') }}
              </UButton>

              <UDropdownMenu v-if="!isMobile" :items="sortDropdownItems"
                :content="{ align: 'end', collisionPadding: 12 }">
                <UButton icon="i-lucide-arrow-down-up" variant="outline" class="w-48 justify-between">
                  <span class="truncate">{{ currentSortLabel }}</span>
                  <UIcon name="i-lucide-chevron-down" class="size-4 opacity-60" />
                </UButton>
              </UDropdownMenu>
              <UButton v-if="!isMobile"
                :icon="sortDir === 'asc' ? 'i-lucide-arrow-up-narrow-wide' : 'i-lucide-arrow-down-wide-narrow'"
                variant="outline" :title="sortDir === 'asc' ? t('common.ascending') : t('common.descending')"
                @click="toggleSortDir" />
            </div>
          </template>
        </UDashboardToolbar>

        <!-- Mobile Filters Modal -->
        <UModal v-model:open="showFiltersModal" title="Filters" :ui="{ content: 'w-full sm:max-w-md' }">
          <template #body>
            <div class="space-y-4">
              <p>ShowFiltersModal</p>
            </div>
          </template>
          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton variant="outline" @click="showFiltersModal = false">
                {{ t('common.close') }}
              </UButton>
            </div>
          </template>
        </UModal>

        <!-- Mobile Sort Modal -->
        <UModal v-model:open="showSortModal" :title="t('common.sort')" :ui="{ content: 'w-full sm:max-w-md' }">
          <template #body>
            <div class="space-y-4">
              <UFormField :label="t('common.sortBy')">
                <USelect v-model="sortBy" class="w-full" :items="sortOptions" :placeholder="t('common.sortBy')" />
              </UFormField>

              <UFormField :label="t('common.direction')">
                <div class="flex gap-2">
                  <UButton class="flex-1" :variant="sortDir === 'asc' ? 'solid' : 'outline'"
                    :icon="sortDir === 'asc' ? 'i-lucide-check' : undefined" @click="sortDir = 'asc'">
                    {{ t('common.ascending') }}
                  </UButton>
                  <UButton class="flex-1" :variant="sortDir === 'desc' ? 'solid' : 'outline'"
                    :icon="sortDir === 'desc' ? 'i-lucide-check' : undefined" @click="sortDir = 'desc'">
                    {{ t('common.descending') }}
                  </UButton>
                </div>
              </UFormField>
            </div>
          </template>
          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton variant="outline" @click="showSortModal = false">
                {{ t('common.close') }}
              </UButton>
            </div>
          </template>
        </UModal>
      </template>
      <template #body>
        <div class="flex-1 min-h-0 overflow-y-auto p-2">
          <UAlert v-if="error" color="error" variant="soft" :title="error" />

          <div v-else-if="users.length === 0" class="text-center py-8">
            <p class="text-gray-600 dark:text-gray-400">{{ t('admin.user.list.noDataFound') }}</p>
          </div>

          <UTable v-else-if="users.length > 0" :data="users" :columns="columns" :loading="loading">
            <template #name-cell="{ row }">
              {{ row.original.name || t('admin.user.list.notAvailable') }}
            </template>

            <template #role-cell="{ row }">
              <!-- Desktop: Inline editing -->
              <div v-if="!isMobile && editingUserId === row.original.id" class="flex items-center gap-2">
                <USelect v-model="editingRole" :items="roles" size="sm" class="w-32" />
                <UButton size="xs" :loading="updating" @click="updateUserRole(row.original.id)">
                  {{ t('common.save') }}
                </UButton>
                <UButton size="xs" variant="outline" @click="cancelEdit">
                  {{ t('common.cancel') }}
                </UButton>
              </div>
              <!-- Mobile & Desktop: Display badge with edit button -->
              <div v-else class="flex items-center gap-2">
                <UBadge :color="row.original.role === 'admin' ? 'primary' : 'neutral'" class="justify-center w-20"
                  variant="soft">
                  {{ t(`admin.user.roles.${row.original.role}`) }}
                </UBadge>
                <UButton v-if="!currentUser || currentUser.id !== row.original.id" icon="i-lucide-pencil" size="xs"
                  variant="ghost" @click="startEditRole(row.original)" />
              </div>
            </template>

            <template #banned-cell="{ row }">
              <UBadge :color="row.original.banned ? 'error' : 'success'" variant="soft">
                {{ row.original.banned ? t('admin.user.status.banned') : t('admin.user.status.notBanned') }}
              </UBadge>
            </template>

            <template #emailVerified-cell="{ row }">
              <UBadge :color="row.original.emailVerified ? 'success' : 'warning'" variant="soft">
                {{ row.original.emailVerified ? t('admin.user.verification.verified') : t('admin.user.verification.pending') }}
              </UBadge>
            </template>

            <template #createdAt-cell="{ row }">
              <span class="text-sm text-gray-600 dark:text-gray-400">
                {{ new Date(row.original.createdAt).toLocaleDateString(locale) }}
              </span>
            </template>

            <template #actions-cell="{ row }">
              <UDropdownMenu :items="[(() => {
                const items = []
                // Only show ban/unban option for non-admin users
                if (row.original.role !== 'admin') {
                  items.push({
                    label: row.original.banned ? t('admin.user.actions.unban') : t('admin.user.actions.ban'),
                    icon: 'i-lucide-ban',
                    onSelect: () => row.original.banned ? openUnbanModal(row.original) : openBanModal(row.original)
                  })
                }
                items.push(
                  { label: t('admin.user.actions.impersonate'), icon: 'i-lucide-user-cog', onSelect: () => openImpersonateModal(row.original) },
                  { label: t('admin.user.actions.sessions'), icon: 'i-lucide-monitor', onSelect: () => openSessionsModal(row.original) },
                  { label: t('admin.user.actions.changePassword'), icon: 'i-lucide-key', onSelect: () => openPasswordModal(row.original) },
                  { label: t('admin.user.actions.update'), icon: 'i-lucide-edit', onSelect: () => openUpdateModal(row.original) }
                )
                return items
              })()]" :content="{ align: 'end' }">
                <UButton variant="ghost" size="sm" icon="i-lucide-more-vertical" />
              </UDropdownMenu>
            </template>
          </UTable>
        </div>
      </template>
    </UDashboardPanel>

    <!-- Ban User Modal -->
    <AdminBanUserModal v-if="showBanModal" v-model:open="showBanModal" :user="selectedUser"
      @success="handleBanSuccess" />

    <!-- Unban User Modal -->
    <AdminUnbanUserModal v-if="showUnbanModal" v-model:open="showUnbanModal" :user="selectedUser"
      @success="handleUnbanSuccess" />

    <!-- Impersonate User Modal -->
    <AdminImpersonateUserModal v-if="showImpersonateModal" v-model:open="showImpersonateModal" :user="selectedUser" />

    <!-- Sessions Modal -->
    <AdminSessionsModal v-if="showSessionsModal" v-model:open="showSessionsModal" :user="selectedUser" />

    <!-- Change Password Modal -->
    <AdminPasswordModal v-if="showPasswordModal" v-model:open="showPasswordModal" :user="selectedUser" />

    <!-- Update User Modal -->
    <AdminUpdateUserModal v-if="showUpdateModal" v-model:open="showUpdateModal" :user="selectedUser"
      @success="handleUpdateSuccess" />

    <!-- Edit Role Modal (Mobile) -->
    <UModal v-model:open="showEditRoleModal" :title="t('admin.user.list.role')" :ui="{ footer: 'justify-end' }">
      <template #body>
        <div class="space-y-4">
          <p v-if="selectedUser" class="text-sm text-gray-600 dark:text-gray-400">
            {{ t('common.edit') }} {{ t('admin.user.list.role') }} for {{ selectedUser.name || selectedUser.email }}
          </p>

          <UFormField name="role" :label="t('admin.user.list.role')">
            <USelect v-model="editingRole" :items="roles" class="w-full" />
          </UFormField>

          <div class="flex gap-4 justify-end pt-4">
            <UButton type="button" variant="outline" :disabled="updating" @click="showEditRoleModal = false">
              {{ t('common.cancel') }}
            </UButton>
            <UButton type="button" :loading="updating" @click="selectedUser && updateUserRole(selectedUser.id)">
              {{ t('common.save') }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
