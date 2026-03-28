<script setup lang="ts">
const route = useRoute()
const requestId = route.params.id as string

const { getRequest, updateRequest, deleteRequest } = useServiceRequests()
const { t } = useI18n()
const userStore = useUserStore()
const toast = useToast()

const request = ref<ServiceRequestWithRelations | null>(null)
const loading = ref(true)
const updating = ref(false)
const showEditModal = ref(false)

const canEdit = computed(() => {
  return request.value?.createdById === userStore.currentUser?.id
})

const canDelete = computed(() => {
  return request.value?.createdById === userStore.currentUser?.id
})

const backRoute = computed(() => {
  if (route.query.from !== 'list') {
    return '/requests'
  }
  const query: Record<string, string> = {}
  if (route.query.search != null && route.query.search !== '') query.search = String(route.query.search)
  if (route.query.status != null && route.query.status !== '') query.status = String(route.query.status)
  if (route.query.priority != null && route.query.priority !== '') query.priority = String(route.query.priority)
  if (route.query.category != null && route.query.category !== '') query.category = String(route.query.category)
  if (route.query.sortBy != null && route.query.sortBy !== '') query.sortBy = String(route.query.sortBy)
  if (route.query.sortDir != null && route.query.sortDir !== '') query.sortDir = String(route.query.sortDir)
  if (route.query.scroll != null && route.query.scroll !== '') query.scroll = String(route.query.scroll)
  if (route.query.page != null && route.query.page !== '') query.page = String(route.query.page)
  return { path: '/requests', query }
})

onMounted(async () => {
  try {
    request.value = await getRequest(requestId)
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

const handleUpdate = async (data: ServiceRequestUpdateInput) => {
  updating.value = true
  try {
    request.value = await updateRequest(requestId, data)
    showEditModal.value = false
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

const handleDelete = async () => {
  if (!confirm('Are you sure you want to delete this request?')) return

  try {
    await deleteRequest(requestId)
    toast.add({
      title: 'Success',
      description: 'Request deleted successfully'
    })
    navigateTo(backRoute.value)
  } catch (error) {
    toast.add({
      title: 'Error',
      description: 'Failed to delete request',
      color: 'error'
    })
  }
}

</script>

<template>
  <div class="container mx-auto py-8 max-w-4xl">
    <div class="mb-4">
      <UButton
        icon="i-lucide-arrow-left"
        variant="ghost"
        size="sm"
        :to="backRoute"
      >
        {{ t('serviceRequest.backToList') || 'Back to Requests' }}
      </UButton>
    </div>

    <div v-if="loading">
      <USkeleton class="h-32 w-full mb-4" />
      <USkeleton class="h-64 w-full" />
    </div>

    <div v-else-if="!request" class="text-center py-8">
      <p>{{ t('serviceRequest.notFound') || 'Request not found' }}</p>
      <UButton :to="backRoute">{{ t('serviceRequest.backToList') || 'Back to Requests' }}</UButton>
    </div>

    <div v-else>
      <CustomerRequestDetail
        :request-id="requestId"
        :can-edit="canEdit"
        :can-delete="canDelete"
        @edit="showEditModal = true"
        @delete="handleDelete"
      />

      <!-- Edit Modal -->
      <UModal v-model="showEditModal">
        <UCard>
          <template #header>
            <h2 class="text-xl font-bold">Edit Request</h2>
          </template>

          <CustomerRequestForm
            :initial-data="request"
            :loading="updating"
            @submit="handleUpdate"
            @cancel="showEditModal = false"
          />
        </UCard>
      </UModal>
    </div>
  </div>
</template>
