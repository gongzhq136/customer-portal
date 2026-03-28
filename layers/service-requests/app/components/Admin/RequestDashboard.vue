<script setup lang="ts">
const props = defineProps<{
  requests: ServiceRequestWithRelations[]
  loading: boolean
  pagination: any
  stats: Record<string, number>
}>()

const emit = defineEmits<{
  select: [id: string]
  filter: [filters: ServiceRequestFilters]
  update: [data: { id: string, updates: AdminServiceRequestUpdateInput }]
}>()
</script>

<template>
  <div class="space-y-6">
    <!-- Stats Overview -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <UCard>
        <div class="text-center">
          <div class="text-3xl font-bold text-blue-600">{{ stats.OPEN || 0 }}</div>
          <div class="text-sm text-gray-600">Open</div>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <div class="text-3xl font-bold text-yellow-600">{{ stats.IN_PROGRESS || 0 }}</div>
          <div class="text-sm text-gray-600">In Progress</div>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <div class="text-3xl font-bold text-green-600">{{ stats.RESOLVED || 0 }}</div>
          <div class="text-sm text-gray-600">Resolved</div>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <div class="text-3xl font-bold text-gray-600">{{ stats.CLOSED || 0 }}</div>
          <div class="text-sm text-gray-600">Closed</div>
        </div>
      </UCard>
    </div>

    <!-- Filters and Table -->
    <AdminRequestTable :requests="requests" :loading="loading" :pagination="pagination"
      @select="$emit('select', $event)" @filter="$emit('filter', $event)" @update="$emit('update', $event)" />
  </div>
</template>
