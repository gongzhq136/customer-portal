import type { CommandPaletteGroup, CommandPaletteItem, NavigationMenuItem } from '@nuxt/ui'

type CommandPaletteItemWithChildren = CommandPaletteItem & {
  children?: CommandPaletteItem[]
  _searchText?: string
}

type MenuItemRole = 'public' | 'authenticated' | 'admin'

interface MenuItemConfig {
  id: string
  labelKey: string
  icon?: string
  to?: string
  target?: '_blank'
  badge?: string | number
  roles?: MenuItemRole[]
  children?: MenuItemConfig[]
  searchGroup?: string // 'home' | 'navigation'
  showInRoot?: boolean // Whether to show in root navigation (default: true)
  showInSearch?: boolean // Whether to show in search (default: true)
  showInHome?: boolean // Whether to show in home (default: false)
}

export const useNavigationLinks = (sidebarOpen: Ref<boolean>) => {
  const { t } = useI18n()
  const userStore = useUserStore()
  const { isAdmin, isAuthenticated } = storeToRefs(userStore)

  const route = useRoute()
  const isHome = computed(() => route.path === '/')

  // Define all menu items in a structured array
  const menuItemsConfig: MenuItemConfig[] = [
    // Home group items
    {
      id: 'home',
      labelKey: 'menu.home',
      icon: 'i-lucide-home',
      to: '/',
      roles: ['public'],
      searchGroup: 'home',
      showInRoot: false,
      children: [
        {
          id: 'blog',
          labelKey: 'nav.blog',
          icon: 'i-lucide-book-open',
          to: '/blog',
          roles: ['public'],
          searchGroup: 'home',
          showInRoot: false,
          showInHome: true
        },
        {
          id: 'contact',
          labelKey: 'nav.contact',
          icon: 'i-lucide-mail',
          to: '/contact',
          roles: ['public'],
          searchGroup: 'home',
          showInRoot: false,
          showInHome: true
        }
      ]
    },
    // Main navigation items
    {
      id: 'dashboard',
      labelKey: 'menu.dashboard',
      icon: 'i-lucide-layout-dashboard',
      to: '/dashboard',
      roles: ['public', 'authenticated'],
      showInRoot: true,
      showInHome: true
    },
    {
      id: 'service-requests',
      labelKey: 'menu.serviceRequests.title',
      icon: 'i-lucide-ticket',
      to: '/requests',
      roles: ['authenticated'],
      searchGroup: 'navigation',
      showInRoot: true
    },
    {
      id: 'my-organizations',
      labelKey: 'myOrganizations.title',
      icon: 'i-lucide-building',
      to: '/my-organizations',
      roles: ['authenticated'],
      searchGroup: 'navigation',
      showInRoot: false,
      showInSearch: false
    },
    // Settings with children
    {
      id: 'settings',
      labelKey: 'menu.settings.title',
      icon: 'i-lucide-settings',
      to: '/settings',
      roles: ['authenticated'],
      searchGroup: 'navigation',
      showInRoot: false,
      children: [
        {
          id: 'settings-profile',
          labelKey: 'menu.settings.profile',
          icon: 'i-lucide-user',
          to: '/settings',
          roles: ['authenticated'],
          searchGroup: 'navigation',
          showInRoot: false
        },
        {
          id: 'settings-organization',
          labelKey: 'menu.settings.organization',
          icon: 'i-lucide-building-2',
          to: '/settings/organization',
          roles: ['authenticated'],
          searchGroup: 'navigation',
          showInRoot: false
        },
        {
          id: 'settings-notifications',
          labelKey: 'menu.settings.notifications',
          icon: 'i-lucide-bell',
          to: '/settings/notifications',
          roles: ['authenticated'],
          searchGroup: 'navigation',
          showInRoot: false
        },
        {
          id: 'settings-security',
          labelKey: 'menu.settings.security',
          icon: 'i-lucide-shield',
          to: '/settings/security',
          roles: ['authenticated'],
          searchGroup: 'navigation',
          showInRoot: false
        }
      ]
    },
    // Admin with children
    {
      id: 'admin',
      labelKey: 'nav.admin',
      icon: 'i-lucide-shield-check',
      to: '/admin/organizations',
      roles: ['admin'],
      searchGroup: 'navigation',
      showInRoot: true,
      children: [
        {
          id: 'admin-organizations',
          labelKey: 'admin.menu.organizations',
          icon: 'i-lucide-building-2',
          to: '/admin/organizations',
          roles: ['admin'],
          searchGroup: 'navigation',
          showInRoot: false
        },
        {
          id: 'admin-users',
          labelKey: 'admin.menu.users',
          icon: 'i-lucide-users',
          to: '/admin/users',
          roles: ['admin'],
          searchGroup: 'navigation',
          showInRoot: false
        },
        {
          id: 'admin-organizations-create',
          labelKey: 'admin.organization.create.title',
          icon: 'i-lucide-plus-circle',
          to: '/admin/organizations/create',
          roles: ['admin'],
          searchGroup: 'navigation',
          showInRoot: false,
          showInSearch: false
        }
      ]
    }
  ]

  // Helper function to check if user has required role
  const hasRequiredRole = (roles?: MenuItemRole[]): boolean => {
    if (!roles || roles.length === 0) return true
    if (roles.includes('public')) return true
    if (roles.includes('authenticated') && isAuthenticated.value) return true
    if (roles.includes('admin') && isAdmin.value) return true
    return false
  }

  // Helper function to convert MenuItemConfig to NavigationMenuItem
  const configToNavigationItem = (config: MenuItemConfig): NavigationMenuItem | null => {
    if (!hasRequiredRole(config.roles)) return null

    const item: NavigationMenuItem = {
      id: config.id,
      label: t(config.labelKey),
      icon: config.icon,
      to: config.to,
      target: config.target,
      badge: config.badge,
      onSelect: () => {
        sidebarOpen.value = false
      }
    }

    if (config.children && config.children.length > 0) {
      const children = config.children
        .map(child => configToNavigationItem(child))
        .filter((item): item is NavigationMenuItem => item !== null)

      if (children.length > 0) {
        item.children = children
      }
    }

    return item
  }

  // Helper function to recursively extract all labels from an item and its children
  const extractSearchableText = (item: CommandPaletteItemWithChildren): string => {
    let text = item.label || ''
    if (item.children && item.children.length > 0) {
      const childrenText = item.children
        .map(child => extractSearchableText(child as CommandPaletteItemWithChildren))
        .join(' ')
      text = `${text} ${childrenText}`.trim()
    }
    return text
  }

  // Helper function to convert MenuItemConfig to CommandPaletteItem
  const configToCommandPaletteItem = (config: MenuItemConfig): CommandPaletteItemWithChildren | null => {
    if (!hasRequiredRole(config.roles) || config.showInSearch === false) return null

    const item: CommandPaletteItemWithChildren = {
      id: config.id,
      label: t(config.labelKey),
      icon: config.icon,
      to: config.to as string,
      target: config.target,
      children: []
    }

    if (config.children && config.children.length > 0) {
      const children = config.children
        .map(child => configToCommandPaletteItem(child))
        .filter((item): item is CommandPaletteItem => item !== null)

      if (children.length > 0) {
        item.children = children
      }
    }

    // Add searchable text that includes children labels
    // This allows Fuse.js to search through children without flattening the structure
    item._searchText = extractSearchableText(item)

    return item
  }

  // Generate navigation links
  const links = computed<NavigationMenuItem[][]>(() => {
    const mainLinks: NavigationMenuItem[] = []
    const footerLinks: NavigationMenuItem[] = []

    menuItemsConfig.forEach((config) => {
      // Skip home item itself, but include its children for home page
      if (config.id === 'home') {
        if (isHome.value && config.children) {
          config.children.forEach((child) => {
            const item = configToNavigationItem(child)
            if (item) mainLinks.push(item)
          })
        }
        return
      }

      // For authenticated pages, skip public-only items that aren't in children
      if (!isHome.value && config.roles?.includes('public') && !config.roles.includes('authenticated')) {
        return
      }

      // Add main navigation items
      if (config.showInRoot !== false) {
        const item = configToNavigationItem(config)
        if (item && (config.showInHome === true || !isHome.value)) mainLinks.push(item)
      }
    })

    return [mainLinks, footerLinks]
  })

  // Generate search groups
  const searchGroups = computed(() => {
    const homeGroupItems: CommandPaletteItemWithChildren[] = []
    const navigationGroupItems: CommandPaletteItemWithChildren[] = []

    // Process each menu item config
    menuItemsConfig.forEach((config) => {
      // Skip if user doesn't have required role or item shouldn't be in search
      if (!hasRequiredRole(config.roles) || config.showInSearch === false) return

      // Convert config to command palette item (this handles children automatically)
      const item = configToCommandPaletteItem(config)
      if (!item) return

      // Determine which group this item belongs to
      const searchGroup = config.searchGroup || 'navigation'

      // Add to appropriate group based on searchGroup property
      // For search, we include items even if showInRoot is false (they'll appear as parents with children)
      if (searchGroup === 'home') {
        homeGroupItems.push(item)
      } else {
        // Add to navigation group - include parent items even if showInRoot is false
        // Children with showInRoot: false are already handled by configToCommandPaletteItem
        navigationGroupItems.push(item)
      }
    })

    // Build groups array
    const groups: CommandPaletteGroup<CommandPaletteItem>[] = []

    // Home group - find the home parent and add it
    const homeParent = homeGroupItems.find(item => item.id === 'home')
    if (homeParent) {
      groups.push({
        id: 'home',
        label: t('menu.home'),
        items: [homeParent]
      })
    }

    // Navigation group - add all navigation items
    if (navigationGroupItems.length > 0) {
      groups.push({
        id: 'navigation',
        label: 'Go to',
        items: navigationGroupItems
      })
    }

    return groups
  })

  return {
    links,
    searchGroups
  }
}
