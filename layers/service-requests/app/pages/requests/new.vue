<script setup lang="ts">
const { createRequest, loading } = useServiceRequests()
const toast = useToast()

const handleSubmit = async (data: ServiceRequestCreateInput) => {
  try {
    await createRequest(data)
    toast.add({
      title: 'Success',
      description: 'Service request created successfully'
    })
    navigateTo('/requests')
  } catch (error) {
    console.error(error)
    toast.add({
      title: 'Error',
      description: 'Failed to create service request',
      color: 'error'
    })
  }
}

</script>

<template>
  <div class="container mx-auto py-8 max-w-2xl">
    <h1 class="text-3xl font-bold mb-6">Create Service Request</h1>

    <CustomerRequestForm
      :loading="loading"
      @submit="handleSubmit"
      @cancel="navigateTo('/requests')"
    />
  </div>
</template>
