<script setup lang="ts">
const props = defineProps<{
  requests: ServiceRequestWithRelations[]
  loading: boolean
  pagination: any
}>()

const emit = defineEmits<{
  select: [id: string]
  filter: [filters: ServiceRequestFilters]
  assign: [id: string]
  update: [data: { id: string, updates: AdminServiceRequestUpdateInput }]
}>()

const currentPage = ref(1)
const filters = reactive({
  status: undefined,
  priority: undefined,
  search: ''
})

watch(filters, () => {
  emit('filter', filters)
})

watch(currentPage, (page) => {
  emit('filter', { ...filters, page })
})

const columns = [
  { key: 'title', label: 'Title' },
  { key: 'status', label: 'Status' },
  { key: 'priority', label: 'Priority' },
  { key: 'organization', label: 'Organization' },
  { key: 'assignedTo', label: 'Assigned To' },
  { key: 'createdAt', label: 'Created' },
  { key: 'actions', label: '' }
]

const getActions = (request: ServiceRequestWithRelations) => {
  return [[
    { label: 'View', click: () => emit('select', request.id) },
    { label: 'Assign', click: () => emit('assign', request.id) },
    { label: 'Resolve', click: () => emit('update', { id: request.id, updates: { status: 'RESOLVED' } }) },
    { label: 'Close', click: () => emit('update', { id: request.id, updates: { status: 'CLOSED' } }) }
  ]]
}

const statusOptions = [
  { label: 'Open', value: 'OPEN' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Resolved', value: 'RESOLVED' },
  { label: 'Closed', value: 'CLOSED' }
]

const priorityOptions = [
  { label: 'Low', value: 'LOW' },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'High', value: 'HIGH' },
  { label: 'Urgent', value: 'URGENT' }
]

const getPriorityColor = (priority: ServiceRequestPriority) => {
  switch (priority) {
    case 'LOW': return 'green'
    case 'MEDIUM': return 'blue'
    case 'HIGH': return 'orange'
    case 'URGENT': return 'red'
    default: return 'gray'
  }
}
</script>

<template>
  <UCard>
    <!-- Filters -->
    <div class="flex gap-2 mb-4">
      <USelect v-model="filters.status" :options="statusOptions" placeholder="Status" />
      <USelect v-model="filters.priority" :options="priorityOptions" placeholder="Priority" />
      <UInput v-model="filters.search" placeholder="Search..." icon="i-lucide-search" />
    </div>

    <!-- Table -->
    <div v-if="loading">
      <USkeleton class="h-12 w-full mb-2" v-for="i in 5" :key="i" />
    </div>

    <UEmpty
      v-else-if="requests.length === 0"
      icon="i-lucide-ticket"
      description="No service requests found"
    />

    <UTable
      v-else
      :rows="requests"
      :columns="columns"
    >
      <template #title-data="{ row }">
        <div class="cursor-pointer hover:underline" @click="$emit('select', row.id)">
          {{ row.title }}
        </div>
      </template>

      <template #status-data="{ row }">
        <StatusBadge :status="row.status" />
      </template>

      <template #priority-data="{ row }">
        <UBadge :color="getPriorityColor(row.priority)" size="xs">
          {{ row.priority }}
        </UBadge>
      </template>

      <template #organization-data="{ row }">
        {{ row.organization?.name }}
      </template>

      <template #assignedTo-data="{ row }">
        <span v-if="row.assignedTo">
          {{ row.assignedTo.name || row.assignedTo.email }}
        </span>
        <UButton
          v-else
          size="xs"
          variant="ghost"
          @click="$emit('assign', row.id)"
        >
          Assign
        </UButton>
      </template>

      <template #actions-data="{ row }">
        <UDropdownMenu :items="getActions(row)">
          <UButton variant="ghost" icon="i-lucide-more-vertical" />
        </UDropdownMenu>
      </template>
    </UTable>

    <!-- Pagination -->
    <div v-if="pagination.pages > 1" class="flex justify-center mt-4">
      <UPagination
        v-model="currentPage"
        :total="pagination.total"
        :page-size="pagination.limit"
      />
    </div>
  </UCard>
</template>
