import { authClient } from '~/utils/auth-client'

export const useAdminServiceRequests = () => {
  const requests = ref<ServiceRequestWithRelations[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const pagination = ref({ total: 0, page: 1, limit: 20, pages: 0 })
  const stats = ref<Record<string, number>>({})

  const fetchAllRequests = async (filters?: ServiceRequestFilters) => {
    loading.value = true
    error.value = null

    try {
      // Verify admin access using better-auth
      const { data: role } = await authClient.organization.getActiveMemberRole()
      const isAdmin = role?.role === 'owner' || role?.role === 'admin'

      if (!isAdmin) {
        throw new Error('Admin access required')
      }

      const response = await $fetch('/api/service-requests/admin', {
        query: filters
      })
      requests.value = response.requests
      pagination.value = response.pagination
      stats.value = response.stats
    } catch (e: any) {
      error.value = e.message
      console.error('Error fetching admin service requests:', e)
    } finally {
      loading.value = false
    }
  }

  const adminUpdateRequest = async (
    id: string,
    data: AdminServiceRequestUpdateInput
  ) => {
    loading.value = true
    error.value = null

    try {
      const updated = await $fetch(`/api/service-requests/admin/${id}`, {
        method: 'PATCH',
        body: data
      })
      const index = requests.value.findIndex(r => r.id === id)
      if (index !== -1) {
        requests.value[index] = updated
      }
      return updated
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  const assignRequest = async (id: string, userId: string) => {
    return adminUpdateRequest(id, { assignedToId: userId })
  }

  const resolveRequest = async (id: string) => {
    return adminUpdateRequest(id, { status: 'RESOLVED' })
  }

  const closeRequest = async (id: string) => {
    return adminUpdateRequest(id, { status: 'CLOSED' })
  }

  const reopenRequest = async (id: string) => {
    return adminUpdateRequest(id, { status: 'OPEN' })
  }

  return {
    requests: readonly(requests),
    loading: readonly(loading),
    error: readonly(error),
    pagination: readonly(pagination),
    stats: readonly(stats),
    fetchAllRequests,
    adminUpdateRequest,
    assignRequest,
    resolveRequest,
    closeRequest,
    reopenRequest
  }
}
