import { authClient } from '~/utils/auth-client'

type Pagination = {
  total: number
  page: number
  limit: number
  pages: number
}

type ServiceRequestsListResponse = { items: ServiceRequest[], totalCount: number } | { requests: ServiceRequest[], pagination: Pagination }

export const useServiceRequests = () => {
  const { t } = useI18n()
  const requests = ref<ServiceRequest[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const pagination = ref<Pagination>({ total: 0, page: 1, limit: 20, pages: 0 })

  const fetchRequests = async (filters?: ServiceRequestFilters) => {
    loading.value = true
    error.value = null

    try {
      // Get current organization using better-auth
      const { data: member } = await authClient.organization.getActiveMember()
      const organizationId = member?.organizationId

      if (!organizationId) {
        throw new Error('No organization found')
      }

      const limit = filters?.limit ?? 20
      const page = filters?.page ?? 1
      const take = limit
      const skip = (Math.max(1, page) - 1) * take

      const query: Record<string, unknown> = { ...filters, take, skip }

      const response = await $fetch<ServiceRequestsListResponse>('/api/service-requests', {
        // org is derived from session on the server; don't send organizationId
        query
      })

      // Normalize list response shapes
      const items = ('items' in response && Array.isArray(response.items))
        ? response.items
        : (('requests' in response && Array.isArray(response.requests)) ? response.requests : [])

      requests.value = items

      const total = ('totalCount' in response && typeof response.totalCount === 'number')
        ? response.totalCount
        : (('pagination' in response && typeof response.pagination?.total === 'number') ? response.pagination.total : items.length)

      pagination.value = {
        total,
        page: Math.floor(skip / Math.max(1, take)) + 1,
        limit: take,
        pages: Math.ceil(total / Math.max(1, take))
      }
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Error fetching service requests'
      console.error('Error fetching service requests:', e)
    } finally {
      loading.value = false
    }
  }

  const createRequest = async (data: ServiceRequestCreateInput) => {
    loading.value = true
    error.value = null

    try {
      const newRequest = await $fetch<ServiceRequest>('/api/service-requests', {
        method: 'POST',
        body: data
      })
      requests.value.unshift(newRequest)
      return newRequest
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to create service request'
      throw e
    } finally {
      loading.value = false
    }
  }

  const updateRequest = async (
    id: string,
    data: ServiceRequestUpdateInput
  ) => {
    loading.value = true
    error.value = null

    try {
      const updated = await $fetch<ServiceRequest>(`/api/service-requests/${id}`, {
        method: 'PATCH' as const,
        body: data
      })
      const index = requests.value.findIndex(r => r.id === id)
      if (index !== -1) {
        requests.value[index] = updated
      }
      return updated
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to update service request'
      throw e
    } finally {
      loading.value = false
    }
  }

  const deleteRequest = async (id: string) => {
    loading.value = true
    error.value = null

    try {
      await $fetch(`/api/service-requests/${id}`, {
        method: 'DELETE' as const
      })
      requests.value = requests.value.filter(r => r.id !== id)
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to delete service request'
      throw e
    } finally {
      loading.value = false
    }
  }

  const getRequest = async (id: string) => {
    loading.value = true
    error.value = null

    try {
      return await $fetch<ServiceRequest>(`/api/service-requests/${id}`)
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to load service request'
      throw e
    } finally {
      loading.value = false
    }
  }

  // Helper function to get status badge text
  const getStatusBadgeText = (status: ServiceRequestStatus): string => {
    return t(`serviceRequest.statusBadge.${status.toLowerCase()}`)
  }

  // Helper function to get priority badge text
  const getPriorityBadgeText = (priority: ServiceRequestPriority): string => {
    return t(`serviceRequest.priorityBadge.${priority.toLowerCase()}`)
  }
  const getPriorityColor = (priority: ServiceRequestPriority) => {
    switch (priority) {
      case 'LOW': return 'success'
      case 'MEDIUM': return 'info'
      case 'HIGH': return 'warning'
      case 'URGENT': return 'error'
      default: return 'neutral'
    }
  }

  const getStatusColor = (status: ServiceRequestStatus) => {
    switch (status) {
      case 'OPEN': return 'primary'
      case 'IN_PROGRESS': return 'warning'
      case 'RESOLVED': return 'success'
      case 'CLOSED': return 'neutral'
      default: return 'neutral'
    }
  }
  // Filter options
  const statusOptions = computed(() => [
    { label: 'All Statuses', value: undefined },
    {
      label: t('serviceRequest.status.open'),
      value: 'OPEN' as ServiceRequestStatus,
      badgeText: getStatusBadgeText('OPEN'),
      badgeColor: getStatusColor('OPEN')
    },
    {
      label: t('serviceRequest.status.in_progress'),
      value: 'IN_PROGRESS' as ServiceRequestStatus,
      badgeText: getStatusBadgeText('IN_PROGRESS'),
      badgeColor: getStatusColor('IN_PROGRESS')
    },
    {
      label: t('serviceRequest.status.resolved'),
      value: 'RESOLVED' as ServiceRequestStatus,
      badgeText: getStatusBadgeText('RESOLVED'),
      badgeColor: getStatusColor('RESOLVED')
    },
    {
      label: t('serviceRequest.status.closed'),
      value: 'CLOSED' as ServiceRequestStatus,
      badgeText: getStatusBadgeText('CLOSED'),
      badgeColor: getStatusColor('CLOSED')
    }
  ])

  const priorityOptions = computed(() => [
    { label: 'All Priorities', value: undefined },
    {
      label: t('serviceRequest.priority.low'),
      value: 'LOW' as ServiceRequestPriority,
      badgeText: getPriorityBadgeText('LOW'),
      badgeColor: getPriorityColor('LOW')
    },
    {
      label: t('serviceRequest.priority.medium'),
      value: 'MEDIUM' as ServiceRequestPriority,
      badgeText: getPriorityBadgeText('MEDIUM'),
      badgeColor: getPriorityColor('MEDIUM')
    },
    {
      label: t('serviceRequest.priority.high'),
      value: 'HIGH' as ServiceRequestPriority,
      badgeText: getPriorityBadgeText('HIGH'),
      badgeColor: getPriorityColor('HIGH')
    },
    {
      label: t('serviceRequest.priority.urgent'),
      value: 'URGENT' as ServiceRequestPriority,
      badgeText: getPriorityBadgeText('URGENT'),
      badgeColor: getPriorityColor('URGENT')
    }
  ])

  return {
    requests: readonly(requests),
    loading: readonly(loading),
    error: readonly(error),
    pagination: readonly(pagination),
    fetchRequests,
    createRequest,
    updateRequest,
    deleteRequest,
    getRequest,
    getStatusColor,
    getPriorityBadgeText,
    getPriorityColor,
    getStatusBadgeText,
    statusOptions,
    priorityOptions
  }
}
