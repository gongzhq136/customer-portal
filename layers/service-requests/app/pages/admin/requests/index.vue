<script setup lang="ts">
const {
  requests,
  loading,
  pagination,
  stats,
  fetchAllRequests,
  adminUpdateRequest
} = useAdminServiceRequests()

const toast = useToast()

onMounted(() => {
  fetchAllRequests()
})

const handleFilter = (filters: ServiceRequestFilters) => {
  fetchAllRequests(filters)
}

const handleUpdate = async ({ id, updates }: { id: string, updates: AdminServiceRequestUpdateInput }) => {
  try {
    await adminUpdateRequest(id, updates)
    toast.add({
      title: 'Success',
      description: 'Request updated successfully'
    })
  } catch (error) {
    toast.add({
      title: 'Error',
      description: 'Failed to update request',
      color: 'error'
    })
  }
}

definePageMeta({
  middleware: ['auth', 'admin']
})
</script>

<template>
  <div class="container mx-auto py-8">
    <h1 class="text-3xl font-bold mb-6">Service Requests Management</h1>

    <AdminRequestDashboard
      :requests="requests"
      :loading="loading"
      :pagination="pagination"
      :stats="stats"
      @select="navigateTo(`/admin/requests/${$event}`)"
      @filter="handleFilter"
      @update="handleUpdate"
    />
  </div>
</template>
