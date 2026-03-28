<script setup lang="ts">
import type { QueryResult } from '~~/shared/types'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const toast = useToast()
const userStore = useUserStore()

const { getStatusColor, getStatusBadgeText, getPriorityBadgeText, getPriorityColor, statusOptions, priorityOptions } = useServiceRequests()

// Mobile breakpoint detection
const breakpoints = useBreakpoints({
  mobile: 768
})
const isMobile = breakpoints.smaller('mobile')

// Filter modal state
const showFiltersModal = ref(false)
const showSortModal = ref(false)

const pending = ref(true)
const pageSize = ref(10)
const canLoadMore = ref(false)
const error = ref<Error | null>(null)
const list = ref<ServiceRequestWithRelations[]>([])
const totalCount = ref(0)
const initialLoadComplete = ref(false)

// Initialize from URL (with defaults)
const currentPage = ref(Math.max(1, Number(route.query.page) || 1))
const listScrollTop = ref(0)
const listContainerRef = ref<HTMLElement | null>(null)
const scrollRestored = ref(false)

// Drawer state (create / view / edit)
type DrawerMode = 'create' | 'view' | 'edit'
const drawerOpen = ref(false)
const drawerMode = ref<DrawerMode>('view')
const selectedRequest = ref<ServiceRequest | null>(null)
const mutationPending = ref(false)

const drawerTitle = computed(() => {
  if (drawerMode.value === 'create') return t('serviceRequest.create')
  if (drawerMode.value === 'edit') return t('serviceRequest.edit')
  return selectedRequest.value?.title || t('serviceRequest.title')
})

const canCreate = computed(() => userStore.hasPermission('service-request', 'create'))
const isOwner = computed(() => {
  if (!selectedRequest.value?.createdById) return false
  return selectedRequest.value.createdById === userStore.currentUser?.id
})
const canEdit = computed(() => isOwner.value || userStore.hasPermission('service-request', 'update'))
const canDelete = computed(() => isOwner.value || userStore.hasPermission('service-request', 'delete'))

const showDeleteConfirm = ref(false)

const openCreateDrawer = () => {
  drawerMode.value = 'create'
  selectedRequest.value = null
  drawerOpen.value = true
}

const openViewDrawer = async (request: ServiceRequest) => {
  drawerMode.value = 'view'
  selectedRequest.value = request
  drawerOpen.value = true
}

const closeDrawer = () => {
  drawerOpen.value = false
}

// Filter state (init from URL)
const statusFilter = ref<ServiceRequestStatus | undefined>(
  (route.query.status as ServiceRequestStatus) || undefined
)
const priorityFilter = ref<ServiceRequestPriority | undefined>(
  (route.query.priority as ServiceRequestPriority) || undefined
)
const categoryFilter = ref<string | undefined>(
  (route.query.category as string) || undefined
)
const searchQuery = ref((route.query.search as string) ?? '')

// Sort state (init from URL)
const sortBy = ref<'createdAt' | 'status' | 'priority'>(
  ['createdAt', 'status', 'priority'].includes(route.query.sortBy as string)
    ? (route.query.sortBy as 'createdAt' | 'status' | 'priority')
    : 'createdAt'
)
const sortDir = ref<'asc' | 'desc'>(
  route.query.sortDir === 'asc' ? 'asc' : 'desc'
)

const sortOptions = computed(() => [
  { label: t('serviceRequest.fields.createdAt'), value: 'createdAt' as const },
  { label: t('serviceRequest.fields.status'), value: 'status' as const },
  { label: t('serviceRequest.fields.priority'), value: 'priority' as const }
])

const currentSortLabel = computed(() => {
  return sortOptions.value.find(o => o.value === sortBy.value)?.label || ''
})

const sortDropdownItems = computed(() => [
  sortOptions.value.map(option => ({
    label: option.label,
    icon: sortBy.value === option.value ? 'i-lucide-check' : undefined,
    onSelect: () => {
      sortBy.value = option.value
    }
  }))
])

const toggleSortDir = () => {
  sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
}

function buildListQuery(includeScrollAndPage = false) {
  const q: Record<string, string> = {}
  if (searchQuery.value.trim()) q.search = searchQuery.value.trim()
  if (statusFilter.value) q.status = statusFilter.value
  if (priorityFilter.value) q.priority = priorityFilter.value
  if (categoryFilter.value) q.category = categoryFilter.value
  if (sortBy.value !== 'createdAt') q.sortBy = sortBy.value
  if (sortDir.value !== 'desc') q.sortDir = sortDir.value
  if (includeScrollAndPage && listScrollTop.value > 0) q.scroll = String(listScrollTop.value)
  if (includeScrollAndPage && currentPage.value > 1) q.page = String(currentPage.value)
  return q
}

function getDetailTo(request: ServiceRequestWithRelations) {
  const query = new URLSearchParams({ from: 'list', ...buildListQuery(true) })
  return `/requests/${request.id}?${query.toString()}`
}

function onListScroll() {
  if (listContainerRef.value) listScrollTop.value = listContainerRef.value.scrollTop
}

// Extract unique categories from loaded requests
const categoryOptions = computed(() => {
  const categories = new Set<string>()
  list.value.forEach(request => {
    if (request.category) {
      categories.add(request.category)
    }
  })
  const sortedCategories = Array.from(categories).sort()
  return [
    { label: 'All Categories', value: undefined },
    ...sortedCategories.map(cat => ({ label: cat, value: cat }))
  ]
})

const loadData = async () => {
  error.value = null
  pending.value = true
  try {
    const query: Record<string, string | number | undefined> = {
      skip: (currentPage.value - 1) * pageSize.value,
      take: pageSize.value
    }

    if (statusFilter.value) {
      query.status = statusFilter.value
    }

    if (priorityFilter.value) {
      query.priority = priorityFilter.value
    }

    if (categoryFilter.value) {
      query.category = categoryFilter.value
    }

    if (searchQuery.value.trim()) {
      query.search = searchQuery.value.trim()
    }

    query.sortBy = sortBy.value
    query.sortDir = sortDir.value

    const result = await $fetch<QueryResult<ServiceRequestWithRelations>>('/api/service-requests', {
      query
    })
    totalCount.value = result.totalCount
    if (currentPage.value === 1) {
      list.value = result.items
    } else {
      const newItems = result.items.filter(item => !list.value.some((existing: ServiceRequestWithRelations) => existing.id === item.id))
      list.value = [...list.value, ...newItems]
    }
    canLoadMore.value = list.value.length < result.totalCount
  } catch (e) {
    console.error(e)
  } finally {
    pending.value = false
  }
}

const refresh = async () => {
  currentPage.value = 1
  list.value = []
  await loadData()
}

type WithOptionalCategory = { category?: string }
const sanitizeCreateOrUpdatePayload = <T extends WithOptionalCategory>(data: T): T => {
  // Avoid storing empty-string category
  const payload = { ...data } as T & WithOptionalCategory
  if (typeof payload.category === 'string' && payload.category.trim() === '') {
    delete (payload as WithOptionalCategory).category
  }
  return payload
}

const handleCreate = async (data: ServiceRequestCreateInput) => {
  mutationPending.value = true
  try {
    await $fetch<ServiceRequest>('/api/service-requests', {
      method: 'POST',
      body: sanitizeCreateOrUpdatePayload(data)
    })

    toast.add({
      title: t('common.success'),
      description: t('serviceRequest.messages.createSuccess')
    })

    closeDrawer()
    await refresh()
  } catch (e) {
    console.error(e)
    toast.add({
      title: t('common.error'),
      description: t('serviceRequest.messages.createError'),
      color: 'error'
    })
  } finally {
    mutationPending.value = false
  }
}

const handleUpdate = async (data: ServiceRequestCreateInput) => {
  if (!selectedRequest.value?.id) return

  mutationPending.value = true
  try {
    const updated = await $fetch<ServiceRequest>(`/api/service-requests/${selectedRequest.value.id}`, {
      method: 'PATCH',
      body: sanitizeCreateOrUpdatePayload(data as ServiceRequestUpdateInput)
    })

    // Keep local selection in sync
    selectedRequest.value = updated

    toast.add({
      title: t('common.success'),
      description: t('serviceRequest.messages.updateSuccess')
    })

    closeDrawer()
    await refresh()
  } catch (e) {
    console.error(e)
    toast.add({
      title: t('common.error'),
      description: t('serviceRequest.messages.updateError'),
      color: 'error'
    })
  } finally {
    mutationPending.value = false
  }
}

const handleDelete = async () => {
  if (!selectedRequest.value?.id) return

  mutationPending.value = true
  try {
    await $fetch(`/api/service-requests/${selectedRequest.value.id}`, {
      method: 'DELETE'
    })

    toast.add({
      title: t('common.success'),
      description: t('serviceRequest.messages.deleteSuccess')
    })

    closeDrawer()
    await refresh()
  } catch (e) {
    console.error(e)
    toast.add({
      title: t('common.error'),
      description: t('serviceRequest.messages.deleteError'),
      color: 'error'
    })
  } finally {
    mutationPending.value = false
  }
}

const editInitialData = computed<Partial<ServiceRequest> | undefined>(() => {
  if (drawerMode.value !== 'edit') return undefined
  return selectedRequest.value ?? undefined
})

// Debounced search function
let searchTimeout: ReturnType<typeof setTimeout> | null = null
const handleSearch = () => {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    list.value = []
    loadData()
    router.replace({ path: '/requests', query: buildListQuery() })
  }, 300) // 300ms debounce
}

// Watch filters and reset pagination when they change
watch([statusFilter, priorityFilter, categoryFilter], () => {
  currentPage.value = 1
  list.value = []
  loadData()
  router.replace({ path: '/requests', query: buildListQuery() })
})

watch([sortBy, sortDir], () => {
  currentPage.value = 1
  list.value = []
  loadData()
  router.replace({ path: '/requests', query: buildListQuery() })
})

// Watch search query with debouncing
watch(searchQuery, () => {
  handleSearch()
})

async function loadPagesUpTo(pageNum: number) {
  if (pageNum < 1) return
  list.value = []
  totalCount.value = 0
  canLoadMore.value = false
  for (let p = 1; p <= pageNum; p++) {
    currentPage.value = p
    await loadData()
  }
}

async function restoreScrollAfterLoad() {
  const scrollVal = route.query.scroll
  if (scrollRestored.value || scrollVal === undefined || scrollVal === null) return
  const scrollNum = Number(scrollVal)
  if (!Number.isFinite(scrollNum) || scrollNum < 0) return
  await nextTick()
  if (!listContainerRef.value) return
  listContainerRef.value.scrollTop = scrollNum
  scrollRestored.value = true
}

const initialPage = Math.max(1, Number(route.query.page) || 1)
if (initialPage > 1) {
  await loadPagesUpTo(initialPage)
  initialLoadComplete.value = true
  await nextTick()
  restoreScrollAfterLoad()
} else {
  await loadData()
  initialLoadComplete.value = true
  await nextTick()
  restoreScrollAfterLoad()
}

const formatDate = (date: Date) => {
  return new Date(date).toLocaleDateString()
}

const loadMoreInProgress = ref(false)

const loadMore = async () => {
  if (!initialLoadComplete.value) return
  if (pending.value || loadMoreInProgress.value) return
  if (!canLoadMore.value) return

  // Prevent "load everything instantly" when the container isn't scrollable yet.
  const el = listContainerRef.value
  if (el && el.scrollHeight <= el.clientHeight + 16) return

  loadMoreInProgress.value = true
  try {
    currentPage.value++
    await loadData()
    await nextTick()
  } finally {
    loadMoreInProgress.value = false
  }
}

useInfiniteScroll(listContainerRef, loadMore, {
  distance: 200,
  canLoadMore: () => initialLoadComplete.value && canLoadMore.value && !pending.value && !loadMoreInProgress.value
})
</script>

<template>
  <UDashboardPanel
    id="service-requests"
    class="lg:pb-8 min-h-0 overflow-hidden"
    style="height: calc(100dvh - var(--ui-header-height));"
    :ui="{ body: 'flex flex-col gap-4 sm:gap-6 flex-1 min-h-0 p-4 sm:p-6 overflow-hidden' }"
  >
    <template #header>
      <UDashboardNavbar :ui="{ right: 'gap-3' }" :toggle="false">
        <template #leading>
          <UIcon name="i-lucide-ticket" class="size-6 shrink-0" />
          <span class="text-lg font-semibold text-gray-900 dark:text-white">
            Service Requests
          </span>
        </template>

        <template #right>
          <div class="flex gap-2 w-full sm:w-auto">
            <UButton
              icon="i-lucide-plus"
              color="primary"
              class="flex-1 sm:flex-none"
              :title="t('serviceRequest.create')"
              :disabled="!canCreate"
              @click="openCreateDrawer"
            />
            <UButton
              icon="i-lucide-refresh-cw"
              variant="outline"
              :loading="pending"
              class="flex-1 sm:flex-none"
              :title="t('common.refresh')"
              @click="refresh"
            />
          </div>
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <div class="flex items-center gap-2 w-full">
            <UInput
              v-model="searchQuery"
              :placeholder="t('common.searchPlaceholder')"
              icon="i-lucide-search"
              :loading="pending"
              class="flex-1 max-w-md"
              clearable
            />
            <USelect
              v-if="!isMobile"
              v-model="statusFilter"
              :items="statusOptions"
              placeholder="Filter by status"
              class="w-48"
            >
              <template #item="{ item }">
                <div class="flex items-center justify-between w-full gap-2">
                  <span class="flex-1 truncate">{{ item.label }}</span>
                  <UBadge
                    v-if="item.badgeText"
                    :color="item.badgeColor as any"
                    size="xs"
                    class="shrink-0 min-w-[100px] justify-center"
                  >
                    {{ item.badgeText }}
                  </UBadge>
                </div>
              </template>
            </USelect>
            <USelect
              v-if="!isMobile"
              v-model="priorityFilter"
              :items="priorityOptions"
              placeholder="Filter by priority"
              class="w-48"
            >
              <template #item="{ item }">
                <div class="flex items-center justify-between w-full gap-2">
                  <span class="flex-1 truncate">{{ item.label }}</span>
                  <UBadge
                    v-if="item.badgeText"
                    :color="item.badgeColor as any"
                    size="xs"
                    class="shrink-0 min-w-[100px] justify-center"
                  >
                    {{ item.badgeText }}
                  </UBadge>
                </div>
              </template>
            </USelect>
            <USelect
              v-if="!isMobile"
              v-model="categoryFilter"
              :items="categoryOptions"
              placeholder="Filter by category"
              class="w-48"
            />
          </div>
        </template>
        <template #right>
          <div class="flex items-center gap-2">
            <UButton
              v-if="isMobile"
              icon="i-lucide-filter"
              variant="outline"
              @click="showFiltersModal = true"
            >
              Filters
            </UButton>
            <UButton
              v-if="isMobile"
              icon="i-lucide-arrow-down-up"
              variant="outline"
              :title="t('common.sort')"
              @click="showSortModal = true"
            >
              {{ t('common.sort') }}
            </UButton>

            <UDropdownMenu
              v-if="!isMobile"
              :items="sortDropdownItems"
              :content="{ align: 'end', collisionPadding: 12 }"
            >
              <UButton
                icon="i-lucide-arrow-down-up"
                variant="outline"
                class="w-48 justify-between"
              >
                <span class="truncate">{{ currentSortLabel }}</span>
                <UIcon name="i-lucide-chevron-down" class="size-4 opacity-60" />
              </UButton>
            </UDropdownMenu>
            <UButton
              v-if="!isMobile"
              :icon="sortDir === 'asc' ? 'i-lucide-arrow-up-narrow-wide' : 'i-lucide-arrow-down-wide-narrow'"
              variant="outline"
              :title="sortDir === 'asc' ? t('common.ascending') : t('common.descending')"
              @click="toggleSortDir"
            />
          </div>
        </template>
      </UDashboardToolbar>

      <!-- Mobile Filters Modal -->
      <UModal v-model:open="showFiltersModal" title="Filters" :ui="{ content: 'w-full sm:max-w-md' }">
        <template #body>
          <div class="space-y-4">
            <UFormField label="Status">
              <USelect
                v-model="statusFilter"
                class="w-full"
                :items="statusOptions"
                placeholder="Filter by status"
              >
                <template #item="{ item }">
                  <div class="flex items-center justify-between w-full gap-2">
                    <span class="flex-1 truncate">{{ item.label }}</span>
                    <UBadge
                      v-if="item.badgeText"
                      :color="item.badgeColor as any"
                      size="xs"
                      class="shrink-0 min-w-[100px] justify-center"
                    >
                      {{ item.badgeText }}
                    </UBadge>
                  </div>
                </template>
              </USelect>
            </UFormField>

            <UFormField label="Priority">
              <USelect
                v-model="priorityFilter"
                :items="priorityOptions"
                placeholder="Filter by priority"
                class="w-full"
              >
                <template #item="{ item }">
                  <div class="flex items-center justify-between w-full gap-2">
                    <span class="flex-1 truncate">{{ item.label }}</span>
                    <UBadge
                      v-if="item.badgeText"
                      :color="item.badgeColor as any"
                      size="xs"
                      class="shrink-0 min-w-[100px] justify-center"
                    >
                      {{ item.badgeText }}
                    </UBadge>
                  </div>
                </template>
              </USelect>
            </UFormField>

            <UFormField label="Category">
              <USelect
                v-model="categoryFilter"
                class="w-full"
                :items="categoryOptions"
                placeholder="Filter by category"
              />
            </UFormField>
          </div>
        </template>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton
              variant="outline"
              @click="showFiltersModal = false"
            >
              Close
            </UButton>
          </div>
        </template>
      </UModal>

      <!-- Mobile Sort Modal -->
      <UModal v-model:open="showSortModal" :title="t('common.sort')" :ui="{ content: 'w-full sm:max-w-md' }">
        <template #body>
          <div class="space-y-4">
            <UFormField :label="t('common.sortBy')">
              <USelect
                v-model="sortBy"
                class="w-full"
                :items="sortOptions"
                :placeholder="t('common.sortBy')"
              />
            </UFormField>

            <UFormField :label="t('common.direction')">
              <div class="flex gap-2">
                <UButton
                  class="flex-1"
                  :variant="sortDir === 'asc' ? 'solid' : 'outline'"
                  :icon="sortDir === 'asc' ? 'i-lucide-check' : undefined"
                  @click="sortDir = 'asc'"
                >
                  {{ t('common.ascending') }}
                </UButton>
                <UButton
                  class="flex-1"
                  :variant="sortDir === 'desc' ? 'solid' : 'outline'"
                  :icon="sortDir === 'desc' ? 'i-lucide-check' : undefined"
                  @click="sortDir = 'desc'"
                >
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
      <div ref="listContainerRef" class="flex-1 min-h-0 overflow-y-auto p-2" @scroll="onListScroll">
        <!-- Keep content away from the scrollbar (works even with overlay scrollbars) -->
        <div class="pr-10">
          <UEmpty
            v-if="list.length === 0 && !pending"
            icon="i-lucide-ticket"
            description="No service requests found"
          />

          <div class="space-y-4">
            <UCard
              v-for="request in list"
              :key="request.id"
              class="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900"
              @click="navigateTo(getDetailTo(request))"
            >
              <div class="flex justify-between items-start">
                <div class="flex-1 min-w-0">
                  <h3 class="font-semibold">{{ request.title }}</h3>
                  <p class="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                    {{ request.description }}
                  </p>
                  <div class="flex gap-2 mt-2 text-xs text-gray-500">
                    <span>{{ formatDate(request.createdAt) }}</span>
                    <span v-if="request.category">• {{ request.category }}</span>
                  </div>
                </div>
                <div class="flex flex-col items-end gap-2 shrink-0">
                  <UButton
                    :to="getDetailTo(request)"
                    variant="outline"
                    size="sm"
                    class="shrink-0"
                    @click.stop
                  >
                    {{ t('common.view') }}
                  </UButton>
                  <UBadge :color="getStatusColor(request.status)" variant="solid" size="md">
                    {{ getStatusBadgeText(request.status) }}
                  </UBadge>
                  <UBadge :color="getPriorityColor(request.priority)" variant="soft" size="md">
                    {{ getPriorityBadgeText(request.priority) }}
                  </UBadge>
                </div>
              </div>
            </UCard>
          </div>

          <div v-if="pending" class="py-4 space-y-2">
            <USkeleton v-for="i in 2" :key="i" class="h-20 w-full" />
          </div>
        </div>
      </div>

      <div class="shrink-0 border-t border-default px-4 py-2 text-sm text-muted flex items-center justify-between">
        <span>
          {{ t('common.totalRecords') }}: <span class="font-medium text-highlighted">{{ totalCount }}</span>
        </span>
        <span>
          {{ t('common.loaded') }}: <span class="font-medium text-highlighted">{{ list.length }}</span>
        </span>
      </div>

      <!-- Drawer (create / view / edit) -->
      <USlideover v-if="drawerOpen" v-model:open="drawerOpen" :title="drawerTitle" :ui="{ content: 'w-full sm:max-w-lg' }">
        <template #body>
          <div class="space-y-4">
            <template v-if="drawerMode === 'view' && selectedRequest">
              <CustomerRequestDetail
                :request-id="selectedRequest.id"
                :can-edit="canEdit"
                :can-delete="canDelete"
                @edit="drawerMode = 'edit'"
                @delete="showDeleteConfirm = true"
              />
            </template>

            <template v-else>
              <CustomerRequestForm
                :initial-data="editInitialData"
                :loading="mutationPending"
                @submit="drawerMode === 'create' ? handleCreate($event) : handleUpdate($event)"
                @cancel="closeDrawer"
              />

              <div v-if="drawerMode === 'edit' && canDelete" class="pt-2">
                <UButton
                  color="error"
                  variant="outline"
                  icon="i-lucide-trash-2"
                  :loading="mutationPending"
                  @click="showDeleteConfirm = true"
                >
                  {{ t('common.delete') }}
                </UButton>
              </div>
            </template>
          </div>

          <ConfirmationModal
            v-model:open="showDeleteConfirm"
            title="serviceRequest.delete"
            message="serviceRequest.confirmDelete"
            confirm-color="error"
            confirm-text="common.delete"
            @confirm="handleDelete"
          />
        </template>
      </USlideover>
    </template>
  </UDashboardPanel>
</template>
