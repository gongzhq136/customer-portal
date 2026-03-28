<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const userStore = useUserStore()
const { isAdmin } = storeToRefs(userStore)

const breakpoints = useBreakpoints({
  mobile: 768
})
const isMobile = breakpoints.smaller('mobile')

if (!isAdmin.value) {
  throw createError({ statusCode: 403, message: 'Admin access required' })
}

const loading = ref(true)
const error = ref('')
const organizations = ref<AdminOrganizationsResponse>([])
const searchQuery = ref((route.query.search as string) ?? '')
const showSortModal = ref(false)
const sortBy = ref<'name' | 'createdAt'>(
  route.query.sortBy === 'createdAt' ? 'createdAt' : 'name'
)
const sortDir = ref<'asc' | 'desc'>(
  route.query.sortDir === 'desc' ? 'desc' : 'asc'
)
const listScrollTop = ref(0)
const listContainerRef = ref<HTMLElement | null>(null)
const scrollRestored = ref(false)

const sortOptions = computed(() => [
  { label: t('admin.organization.list.name'), value: 'name' as const },
  { label: t('admin.organization.list.created'), value: 'createdAt' as const }
])

const currentSortLabel = computed(() =>
  sortOptions.value.find(o => o.value === sortBy.value)?.label
  || t('common.sort')
)

const sortDropdownItems = computed(() =>
  sortOptions.value.map(option => ({
    label: option.label,
    icon: sortBy.value === option.value ? 'i-lucide-check' : undefined,
    onSelect: () => {
      sortBy.value = option.value
    }
  }))
)

const toggleSortDir = () => {
  sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
}

function buildListQuery(includeScroll = false) {
  const q: Record<string, string> = {}
  if (searchQuery.value.trim()) q.search = searchQuery.value.trim()
  if (sortBy.value !== 'name') q.sortBy = sortBy.value
  if (sortDir.value !== 'asc') q.sortDir = sortDir.value
  if (includeScroll && listScrollTop.value > 0) q.scroll = String(listScrollTop.value)
  return q
}

function getViewTo(org: { slug: string }) {
  const query = new URLSearchParams({ from: 'admin-organizations', ...buildListQuery(true) })
  return `/admin/organizations/${org.slug}?${query.toString()}`
}

const filteredAndSortedOrganizations = computed(() => {
  let list = [...organizations.value]
  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    list = list.filter(
      org =>
        org.name?.toLowerCase().includes(q)
        || org.slug?.toLowerCase().includes(q)
    )
  }
  list.sort((a, b) => {
    let cmp = 0
    if (sortBy.value === 'name') {
      cmp = (a.name ?? '').localeCompare(b.name ?? '')
    } else {
      cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    }
    return sortDir.value === 'asc' ? cmp : -cmp
  })
  return list
})

const loadOrganizations = async () => {
  try {
    loading.value = true
    error.value = ''
    organizations.value = await $fetch<AdminOrganizationsResponse>('/api/admin/organizations')
  } catch (err) {
    const apiError = err as ApiError
    error.value = apiError.message || t('admin.errors.failedToLoadUsers')
} finally {
  loading.value = false
  nextTick(() => restoreScrollAfterLoad())
}
}

let searchTimeout: ReturnType<typeof setTimeout> | null = null
watch(searchQuery, () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    router.replace({ path: '/admin/organizations', query: buildListQuery() })
  }, 300)
})

watch([sortBy, sortDir], () => {
  router.replace({ path: '/admin/organizations', query: buildListQuery() })
})

function onListScroll() {
  if (listContainerRef.value) listScrollTop.value = listContainerRef.value.scrollTop
}

onMounted(() => {
  loadOrganizations()
})

onUnmounted(() => {
  if (searchTimeout) clearTimeout(searchTimeout)
})

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

watch([loading, listContainerRef], () => {
  if (!loading.value && listContainerRef.value) restoreScrollAfterLoad()
}, { flush: 'post' })
</script>

<template>
  <UDashboardPanel
    id="admin-organizations"
    class="lg:pb-8 min-h-0 overflow-hidden"
    style="height: calc(100dvh - var(--ui-header-height));"
    :ui="{ body: 'flex flex-col gap-4 sm:gap-6 flex-1 min-h-0 p-4 sm:p-6 overflow-hidden' }"
  >
    <template #header>
      <UDashboardNavbar :ui="{ right: 'gap-3' }" :toggle="false">
        <template #leading>
          <UIcon name="i-lucide-building-2" class="size-6 shrink-0" />
          <span class="text-lg font-semibold text-gray-900 dark:text-white">
            {{ t('admin.organization.list.title') }}
          </span>
        </template>

        <template #right>
          <div class="flex gap-2 w-full sm:w-auto">
            <UButton
              icon="i-lucide-plus"
              color="primary"
              :to="'/admin/organizations/create'"
              class="flex-1 sm:flex-none"
              :title="t('admin.organization.list.createButton')"
            />
            <UButton
              icon="i-lucide-refresh-cw"
              variant="outline"
              :loading="loading"
              class="flex-1 sm:flex-none"
              :title="t('common.refresh')"
              @click="loadOrganizations"
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
              :loading="loading"
              class="flex-1 max-w-md"
              clearable
            />
          </div>
        </template>
        <template #right>
          <div class="flex items-center gap-2">
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
        <div class="pr-10">
          <UAlert v-if="error" color="error" variant="soft" :title="error" class="mb-4" />

          <UEmpty
            v-if="filteredAndSortedOrganizations.length === 0 && !loading"
            icon="i-lucide-building-2"
            :description="t('admin.organization.list.empty')"
          />

          <div v-else class="space-y-4">
            <div
              v-for="org in filteredAndSortedOrganizations"
              :key="org.id"
              class="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
            >
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="font-semibold text-lg">
                    {{ org.name }}
                  </h3>
                  <p class="text-sm text-gray-600 dark:text-gray-400">
                    {{ t('admin.organization.detail.slug') }} {{ org.slug }}
                  </p>
                  <p class="text-xs text-gray-500 mt-1">
                    {{ t('admin.organization.detail.created') }} {{ new Date(org.createdAt).toLocaleDateString() }}
                  </p>
                </div>
                <UButton
                  :to="getViewTo(org)"
                  variant="outline"
                  size="sm"
                >
                  {{ t('admin.organization.list.view') }}
                </UButton>
              </div>
            </div>
          </div>

          <div v-if="loading" class="py-4 space-y-2">
            <USkeleton v-for="i in 2" :key="i" class="h-20 w-full" />
          </div>
        </div>
      </div>

      <div class="shrink-0 border-t border-default px-4 py-2 text-sm text-muted flex items-center justify-between">
        <span>
          {{ t('common.totalRecords') }}: <span class="font-medium text-highlighted">{{ organizations.length }}</span>
        </span>
        <span>
          {{ t('common.loaded') }}: <span class="font-medium text-highlighted">{{ filteredAndSortedOrganizations.length }}</span>
        </span>
      </div>
    </template>
  </UDashboardPanel>
</template>
