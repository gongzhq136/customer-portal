<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

// Mobile breakpoint detection
const breakpoints = useBreakpoints({
  mobile: 768
})
const isMobile = breakpoints.smaller('mobile')

const links = [[{
  label: t('settings.profile'),
  icon: 'i-lucide-user',
  to: '/settings',
  exact: true
}, {
  label: t('settings.organization'),
  icon: 'i-lucide-users',
  to: '/settings/organization'
}, {
  label: t('settings.notifications'),
  icon: 'i-lucide-bell',
  to: '/settings/notifications'
}, {
  label: t('settings.security'),
  icon: 'i-lucide-shield',
  to: '/settings/security'
}]] satisfies NavigationMenuItem[][]

const flatLinks = computed(() => links[0] ?? [])

const activeLink = computed(() => {
  const items = flatLinks.value
  if (!items.length) return undefined
  const found = items.find((item) => {
    const to = String(item.to || '')
    if (!to) return false
    // `/settings` should not match `/settings/*` (profile tab only on the root route)
    if (to === '/settings') return route.path === to
    return route.path === to || route.path.startsWith(`${to}/`)
  })
  return found || items[0]
})

const mobileMenuItems = computed(() => [
  flatLinks.value.map(item => ({
    label: item.label,
    icon: item.icon,
    onSelect: () => router.push(String(item.to))
  }))
])
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
    <UContainer>
      <div class="mb-4">
        <UDropdownMenu
          v-if="isMobile"
          :items="mobileMenuItems"
          :content="{ align: 'start', collisionPadding: 12 }"
          :ui="{
            // Match the trigger width (our button is full-width on mobile)
            content: 'w-(--reka-dropdown-menu-trigger-width) bg-elevated border border-primary/30 shadow-xl rounded-lg',
            // Improve contrast/visibility on dark backgrounds
            item: 'text-highlighted data-highlighted:before:bg-elevated/80',
            itemLabel: 'text-highlighted font-medium',
            itemLeadingIcon: 'text-primary',
            itemDescription: 'text-muted'
          }"
        >
          <UButton
            color="neutral"
            variant="outline"
            class="w-full justify-between"
          >
            <span class="flex items-center gap-2 min-w-0">
              <UIcon v-if="activeLink?.icon" :name="activeLink.icon" class="size-4 shrink-0" />
              <span class="truncate">{{ activeLink?.label }}</span>
            </span>
            <UIcon name="i-lucide-chevron-down" class="size-4 opacity-60 shrink-0" />
          </UButton>
        </UDropdownMenu>

        <UNavigationMenu v-else :items="links" highlight />
      </div>
      <NuxtPage />
    </UContainer>
  </div>
</template>
