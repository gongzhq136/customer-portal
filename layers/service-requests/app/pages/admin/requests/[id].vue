<script setup lang="ts">
const route = useRoute()
const requestId = route.params.id as string

const { adminUpdateRequest } = useAdminServiceRequests()
const toast = useToast()

const request = ref<ServiceRequestWithRelations | null>(null)
const loading = ref(true)
const updating = ref(false)

const adminUpdates = reactive({
  status: '',
  priority: '',
  assignedToId: '',
  internalNotes: ''
})

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

const userOptions = [
  // This would be populated with users from the organization
  { label: 'Select User', value: '' }
]

onMounted(async () => {
  try {
    request.value = await $fetch(`/api/service-requests/${requestId}`)
    adminUpdates.status = request.value.status
    adminUpdates.priority = request.value.priority
    adminUpdates.assignedToId = request.value.assignedToId || ''
    adminUpdates.internalNotes = request.value.internalNotes || ''
  } catch (error) {
    toast.add({
      title: 'Error',
      description: 'Failed to load request',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
})

const handleUpdate = async () => {
  updating.value = true
  try {
    request.value = await adminUpdateRequest(requestId, adminUpdates)
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
  } finally {
    updating.value = false
  }
}

const handleQuickUpdate = () => {
  handleUpdate()
}

definePageMeta({
  middleware: ['auth', 'admin']
})
</script>

<template>
  <div class="container mx-auto py-8 max-w-4xl">
    <div v-if="loading">
      <USkeleton class="h-32 w-full mb-4" />
      <USkeleton class="h-64 w-full" />
    </div>

    <div v-else-if="request" class="space-y-6">
      <!-- Full request details with admin controls -->
      <CustomerRequestDetail :request="request" />

      <USeparator />

      <!-- Admin Actions -->
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">Admin Actions</h3>
        </template>

        <div class="space-y-4">
          <UFormField label="Status">
            <USelect
              v-model="adminUpdates.status"
              :options="statusOptions"
              @change="handleQuickUpdate"
            />
          </UFormField>

          <UFormField label="Priority">
            <USelect
              v-model="adminUpdates.priority"
              :options="priorityOptions"
              @change="handleQuickUpdate"
            />
          </UFormField>

          <UFormField label="Assign To">
            <USelect
              v-model="adminUpdates.assignedToId"
              :options="userOptions"
              @change="handleQuickUpdate"
            />
          </UFormField>

          <UFormField label="Internal Notes">
            <UTextarea
              v-model="adminUpdates.internalNotes"
              :rows="4"
              placeholder="Notes visible only to admins..."
            />
          </UFormField>

          <UButton :loading="updating" @click="handleUpdate">
            Save Changes
          </UButton>
        </div>
      </UCard>
    </div>
  </div>
</template>
