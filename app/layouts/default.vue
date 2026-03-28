<script setup lang="ts">
const route = useRoute()
const toast = useToast()
const open = ref(false)
const showFooter = computed(() => route.meta?.public === true)

const { links } = useNavigationLinks(open)
const { modules, activeModule, activeModuleMenuItems } = useModuleNavigation(open)

const groups = computed(() => [{
  id: 'links',
  label: 'Go to',
  items: links.value.flat()
}])

const moduleSwitchItems = computed(() => [
  modules.value.map(module => ({
    label: module.label,
    icon: module.icon,
    to: module.to
  }))
])

onMounted(async () => {
  const cookie = useCookie('cookie-consent')
  if (cookie.value === 'accepted') {
    return
  }

  toast.add({
    title: 'We use first-party cookies to enhance your experience on our website.',
    duration: 0,
    close: false,
    actions: [{
      label: 'Accept',
      color: 'neutral',
      variant: 'outline',
      onClick: () => {
        cookie.value = 'accepted'
      }
    }, {
      label: 'Opt out',
      color: 'neutral',
      variant: 'ghost'
    }]
  })
})
</script>

<template>
  <div class="relative min-h-screen">
    <!-- AppHeader - fixed at top -->
    <div class="fixed top-0 left-0 right-0 z-50">
      <div class="mx-auto w-full max-w-[1600px] px-4">
        <AppHeader :show-navigation="false" />
      </div>
    </div>

    <UDashboardGroup
      unit="rem"
      class="px-4 mx-auto max-w-[1600px]! w-full!"
    >
      <UDashboardSidebar
        id="default"
        v-model:open="open"
        collapsible
        resizable
        class="bg-elevated/25 lg:pb-12"
        :ui="{ footer: 'lg:border-t lg:border-default' }"
      >
        <template #header>
          <div class="flex flex-col gap-2">
            <UDropdownMenu
              class="lg:hidden"
              :items="moduleSwitchItems"
              :content="{ align: 'start', collisionPadding: 12 }"
            >
              <UButton
                :label="activeModule?.label || 'Module'"
                :icon="activeModule?.icon"
                trailing-icon="i-lucide-chevrons-up-down"
                color="neutral"
                variant="ghost"
                block
                class="justify-between"
              />
            </UDropdownMenu>
          </div>
        </template>
        <template #default="{ collapsed }">
          <UDashboardSearchButton :collapsed="collapsed" class="mt-2 bg-transparent ring-default" />
          <div v-if="!collapsed && activeModule" class="px-2.5 pt-3 pb-1 text-xs font-semibold uppercase text-muted">
            {{ activeModule.label }}
          </div>
          <UNavigationMenu :collapsed="collapsed" :items="activeModuleMenuItems" orientation="vertical" tooltip popover />
        </template>
      </UDashboardSidebar>

      <UDashboardSearch
        :groups="groups"
        :fuse="{
          fuseOptions: {
            ignoreLocation: true,
            threshold: 0.1,
            keys: ['label', 'suffix', '_searchText']
          }
        }"
      />

      <NotificationsSlideover />
      <UMain class="flex-1 min-w-0 pt-20 lg:pt-16">
        <slot />
      </UMain>
    </UDashboardGroup>

    <AppFooter v-if="showFooter" />
  </div>
</template>
