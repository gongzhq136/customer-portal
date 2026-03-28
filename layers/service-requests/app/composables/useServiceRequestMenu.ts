import { authClient } from '~/utils/auth-client'

export const useServiceRequestMenu = () => {
  const userStore = useUserStore()
  const { activeOrganizationRole } = storeToRefs(userStore)

  const isOrganizationAdmin = computed(() => {
    const role = activeOrganizationRole.value
    return role === 'owner' || role === 'admin'
  })

  const menuItems = computed(() => {
    const items = [
      {
        label: 'My Requests',
        to: '/requests',
        icon: 'i-lucide-ticket'
      }
    ]

    if (isOrganizationAdmin.value) {
      items.push({
        label: 'Manage Requests',
        to: '/admin/requests',
        icon: 'i-lucide-settings'
      })
    }

    return items
  })

  return {
    menuItems: readonly(menuItems),
    isOrganizationAdmin: readonly(isOrganizationAdmin)
  }
}
