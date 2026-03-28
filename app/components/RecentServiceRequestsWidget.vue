<script setup lang="ts">
// Try to use service request widget composable (will be undefined if layer not present)
const widget = useServiceRequestWidget?.()

// Initialize with fallback values
const requests = ref<ServiceRequest[]>([])
const loading = ref(false)

if (widget) {
  const { requests: widgetRequests, loading: widgetLoading, initializeWidget } = widget

  // Update refs with widget values
  requests.value = Array.isArray(widgetRequests.value) ? [...widgetRequests.value] : []
  loading.value = widgetLoading.value

  // Watch for changes
  watch(widgetRequests, (newRequests) => {
    requests.value = Array.isArray(newRequests) ? [...newRequests] : []
  })

  watch(widgetLoading, (newLoading) => {
    loading.value = newLoading
  })

  onMounted(() => {
    initializeWidget()
  })
}

const formatDate = (date: Date) => {
  return new Date(date).toLocaleDateString()
}
</script>

<template>
  <div class="space-y-2">
    <div v-if="loading" class="text-center py-8">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin mx-auto text-gray-400" />
    </div>

    <div v-else-if="requests.length === 0">
      <p class="text-gray-500 text-center py-4">No recent requests</p>
      <UButton block @click="navigateTo('/requests/new')">
        Create Your First Request
      </UButton>
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="request in requests.slice(0, 5)"
        :key="request.id"
        class="flex justify-between items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-900 rounded cursor-pointer"
        @click="navigateTo(`/requests/${request.id}`)"
      >
        <div>
          <p class="font-medium">{{ request.title }}</p>
          <p class="text-xs text-gray-500">{{ formatDate(request.createdAt) }}</p>
        </div>
        <StatusBadge :status="request.status" />
      </div>
    </div>
  </div>
</template>
