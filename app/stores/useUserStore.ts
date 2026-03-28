import { defineStore } from 'pinia'
import type { AuthSession, AuthUser, AuthSessionResponse } from '~/utils/auth-client'
import { authClient } from '~/utils/auth-client'
import type { Organization } from '#types'
import type { DashboardUser } from '~/types'

interface UserPermissions {
  [key: string]: boolean
}

interface PermissionsResponse {
  permissions: UserPermissions
  role: string
  organizationRole: string | null
  activeOrganization: Organization | null
}

export const useUserStore = defineStore('user', () => {
  const currentSession = ref<AuthSession | null>(null)
  const currentUser = ref<AuthUser | null>(null)

  // Manual organizations state to prevent 401 errors for unauthenticated users
  const organizationsData = ref<Organization[] | null>(null)
  const organizationsError = ref<Error | null>(null)
  const organizationsIsPending = ref(false)
  const organizationsIsRefetching = ref(false)

  // Fetch organizations manually - only when authenticated
  const fetchOrganizations = async () => {
    if (!currentUser.value) {
      organizationsData.value = null
      organizationsError.value = null
      return
    }

    try {
      organizationsIsPending.value = true
      organizationsError.value = null
      const { data, error } = await authClient.organization.list()
      if (error) {
        organizationsError.value = new Error(error.message || 'Failed to fetch organizations')
        organizationsData.value = null
      } else if (data) {
        // Convert null logos to undefined to match Organization type
        organizationsData.value = data.map(org => ({
          ...org,
          logo: org.logo ?? undefined
        })) as Organization[]
      } else {
        organizationsData.value = null
      }
    } catch (error) {
      organizationsError.value = error instanceof Error ? error : new Error('Failed to fetch organizations')
      organizationsData.value = null
    } finally {
      organizationsIsPending.value = false
      organizationsIsRefetching.value = false
    }
  }

  // Create a helper object that matches the composable interface
  const organizationsHelper = computed(() => ({
    data: organizationsData.value,
    error: organizationsError.value,
    isPending: organizationsIsPending.value,
    isRefetching: organizationsIsRefetching.value,
    refetch: async () => {
      organizationsIsRefetching.value = true
      await fetchOrganizations()
    }
  }))

  const refreshOrganizations = async () => {
    await fetchOrganizations()
  }

  // Watch authentication status and fetch organizations when user becomes authenticated
  watch(currentUser, (user, oldUser) => {
    if (user && !oldUser) {
      // User just logged in, fetch organizations
      fetchOrganizations()
    } else if (!user) {
      // User logged out, clear organizations
      organizationsData.value = null
      organizationsError.value = null
    }
  }, { immediate: true })

  const permissions = ref<UserPermissions>({})
  const role = ref<string | null>(null)
  const organizationRole = ref<string | null>(null)
  const activeOrganizationFromPermissions = ref<Organization | null>(null)
  const isLoading = ref(false)
  const activeOrganization = computed(() => {
    // Prefer the one from permissions API if available, otherwise use organizationsHelper
    return activeOrganizationFromPermissions.value || organizationsHelper.value.data?.find((org: Organization) => org.id === activeOrganizationId.value)
  })

  const colorMode = useColorMode() // Use the colorMode composable
  const theme = ref(colorMode.preference)

  // Watch for changes in colorMode.preference from @nuxtjs/color-mode
  watch(() => colorMode.preference, (newValue) => {
    theme.value = newValue // Update our store's theme ref
  })

  const hasPermission = (subject: string, action: string): boolean => {
    return permissions.value[`${subject}.${action}`] ?? false
  }

  const isAdmin = computed(() => role.value === 'admin')

  const userInitials = computed(() => {
    const user = currentUser.value
    if (!user) {
      return undefined
    }
    const name = user.name || user.email || ''
    if (!name) {
      return ''
    }
    const parts = name.split(' ').filter(part => part.length > 0)
    if (parts.length === 0) {
      return ''
    }
    if (parts.length === 1) {
      return parts[0]?.charAt(0).toUpperCase() || ''
    }
    // Multiple parts: return first char of first part + first char of last part
    const first = parts[0]?.charAt(0) || ''
    const last = parts[parts.length - 1]?.charAt(0) || ''
    return (first + last).toUpperCase()
  })

  const activeOrganizationId = computed(() => {
    return currentSession.value?.activeOrganizationId
  })

  // Store the active organization role
  const activeOrganizationRoleValue = ref<string | null>(null)

  // Watch for changes in activeOrganizationId and fetch the role
  watch([activeOrganizationId, currentUser], async ([newOrgId, user]) => {
    if (newOrgId && user) {
      try {
        const { data: roleData } = await authClient.organization.getActiveMemberRole()
        activeOrganizationRoleValue.value = roleData?.role || null
      } catch (error) {
        console.error('Error fetching active organization role:', error)
        activeOrganizationRoleValue.value = null
      }
    } else {
      activeOrganizationRoleValue.value = null
    }
  }, { immediate: true })

  // Computed property that returns the active organization role
  const activeOrganizationRole = computed(() => {
    return activeOrganizationRoleValue.value
  })

  const loggedInUsingEmail = computed(() => {
    const user = currentUser.value
    if (!user || typeof user.providerId === 'undefined') return false
    return user.providerId === 'credential'
  })

  const fetchUserPermissions = async () => {
    // If there is no current user, or permissions have already been fetched, do nothing.
    if (!currentUser.value) {
      permissions.value = {}
      role.value = null
      return
    }

    // console.log('Fetching user permissions from API for user:', currentUser.value.id)
    try {
      const data = await $fetch<PermissionsResponse>('/api/auth/permissions')
      if (data) {
        permissions.value = data.permissions
        role.value = data.role
        organizationRole.value = data.organizationRole
        activeOrganizationFromPermissions.value = data.activeOrganization
      } else {
        console.warn('Permissions API returned no data. Clearing user data as a precaution.')
        clearUserData() // Clear data if API returns nothing, as state is uncertain
      }
    } catch (error) {
      console.error('Error in fetchUserPermissions:', error)
      clearUserData()
    }
  }

  const clearUserData = () => {
    console.log('Clearing user data and permissions fetch status.')
    permissions.value = {}
    role.value = null
    organizationRole.value = null
    activeOrganizationFromPermissions.value = null
    currentSession.value = null
    currentUser.value = null
    activeOrganizationRoleValue.value = null
  }

  const setActiveOrganizationId = async (organizationId: string) => {
    try {
      isLoading.value = true
      const { data, error } = await authClient.organization.setActive({ organizationId })
      if (error) {
        console.error('Error setting active organization:', error)
        throw error
      }
      if (data) {
        console.log('Active organization set:', data)
        // Fetch the updated session - retry a few times if needed
        let retries = 3
        let sessionResponse = null
        while (retries > 0) {
          sessionResponse = await authClient.getSession()
          // Check if the session has been updated with the new organizationId
          const sessionData = sessionResponse?.data as unknown as AuthSessionResponse & { activeOrganizationId?: string }
          if (sessionData && sessionData.activeOrganizationId === organizationId) {
            break
          }
          console.log('ActiverOganizationId not yet set in Session data, retrying (retries left: ${retries -1})...')
          await new Promise(resolve => setTimeout(resolve, 50))
          retries--
        }

        if (sessionResponse?.data) {
          const sessionData = sessionResponse.data as unknown as AuthSessionResponse
          await setSession(sessionData)
        } else {
          console.warn('Session data not available after setting active organization')
          // Still try to fetch once more
          const finalSession = await authClient.getSession()
          if (finalSession?.data) {
            await setSession(finalSession.data as unknown as AuthSessionResponse)
          }
        }
      }
    } catch (error) {
      console.error('Error setting active organization:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const setSession = async (data: AuthSessionResponse | null) => {
    if (data) {
      try {
        const { user, ...session } = data
        currentSession.value = session
        currentUser.value = data.user as AuthUser

        if (currentUser.value) {
          await fetchUserPermissions()
        }
      } catch (error) {
        console.error('Error setting session:', error)
        clearUserData()
        throw error
      } finally {
        isLoading.value = false
      }
    } else {
      // Session is null/undefined - clear user data (e.g., on logout)
      clearUserData()
    }
  }

  const isAuthenticated = computed(() => {
    return currentUser.value !== null
  })

  // Store roles for each organization
  const organizationRoles = ref<Record<string, string>>({})

  // Track if we've attempted to auto-set the first organization
  const hasAttemptedAutoSet = ref(false)

  // Auto-set first organization when activeOrganizationId is null but user has organizations
  watch([activeOrganizationId, () => organizationsHelper.value.data, currentUser], async ([orgId, organizations, user]) => {
    // Only run on client side
    if (import.meta.server) return

    // Only proceed if:
    // 1. User is authenticated
    // 2. activeOrganizationId is null
    // 3. User has at least one organization
    // 4. We haven't already attempted to set it
    // 5. Organizations are not still loading
    if (
      user
      && !orgId
      && organizations
      && organizations.length > 0
      && !hasAttemptedAutoSet.value
      && !organizationsHelper.value.isPending
    ) {
      hasAttemptedAutoSet.value = true
      try {
        const firstOrg = organizations[0]
        if (firstOrg?.id) {
          console.log('Auto-setting first organization as active:', firstOrg.id)
          await setActiveOrganizationId(firstOrg.id)
        }
      } catch (error) {
        console.error('Error auto-setting first organization:', error)
        // Reset flag on error so we can retry later
        hasAttemptedAutoSet.value = false
      }
    }
  }, { immediate: true })

  // Reset the auto-set flag when activeOrganizationId changes to a non-null value or user logs out
  watch([activeOrganizationId, currentUser], ([orgId, user]) => {
    if (orgId) {
      hasAttemptedAutoSet.value = false
    }
    if (!user) {
      hasAttemptedAutoSet.value = false
    }
  })

  // Fetch roles for all organizations when organizations are loaded
  watch(() => organizationsHelper.value.data, async (organizations) => {
    if (!organizations || !currentUser.value) {
      organizationRoles.value = {}
      return
    }

    // Fetch role for each organization
    const roles: Record<string, string> = {}
    for (const org of organizations) {
      try {
        // Temporarily set active organization to get the role
        // Note: We'll use listMembers to find the user's role instead
        const members = await authClient.organization.listMembers({
          query: { organizationId: org.id }
        })

        if (members?.data) {
          const memberList = Array.isArray(members.data) ? members.data : (members.data as { members?: Array<{ userId: string, role: string | string[] }> })?.members || []
          const userMember = memberList.find((m) => m.userId === currentUser.value?.id)
          if (userMember) {
            const role = Array.isArray(userMember.role) ? userMember.role[0] : userMember.role
            roles[org.id] = role || 'member'
          }
        }
      } catch (error) {
        console.error(`Error fetching role for organization ${org.id}:`, error)
      }
    }
    organizationRoles.value = roles
  }, { immediate: true })

  // Enhanced organizations with roles
  const myOrganizations = computed(() => {
    const orgs = organizationsHelper.value.data as Organization[] | null | undefined
    if (!orgs) return orgs

    return orgs.map(org => ({
      ...org,
      role: organizationRoles.value[org.id] || null
    }))
  })

  const loadingOrganization = computed(() => {
    return organizationsHelper.value.isPending ?? false
  })

  const setCurrentUser = (data: AuthUser | null) => {
    currentUser.value = data
  }

  const dashboardUser = computed(() => {
    if (!currentUser.value) {
      return {
        name: 'User',
        avatar: {
          src: undefined,
          alt: 'User'
        }
      } as DashboardUser
    }
    return {
      name: currentUser.value.name || currentUser.value?.email || 'User',
      avatar: {
        src: currentUser.value.image,
        alt: currentUser.value.name || currentUser.value?.email || 'User'
      }
    } as DashboardUser
  })

  const changePasswordAllowed = computed(() => {
    return currentUser.value?.providerId === 'credential'
  })
  // Fetch current session data using getSession()
  return {
    permissions,
    role,
    organizationRole,
    isAuthenticated,
    isLoading,
    currentSession,
    currentUser,
    isAdmin,
    userInitials,
    loggedInUsingEmail,
    theme,
    activeOrganizationId,
    activeOrganization,
    activeOrganizationRole,
    myOrganizations,
    loadingOrganization,
    refreshOrganizations,
    fetchUserPermissions,
    hasPermission,
    clearUserData,
    setSession,
    setActiveOrganizationId,
    setCurrentUser,
    dashboardUser,
    changePasswordAllowed
  }
})
