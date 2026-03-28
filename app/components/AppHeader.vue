<script setup lang="ts">
import { en, nl } from '@nuxt/ui/locale'
import { authClient } from '~/utils/auth-client'

const route = useRoute()
const { t, locale, setLocale } = useI18n()
const toast = useToast()
// User store
const userStore = useUserStore()
const { currentUser, isAuthenticated, currentSession, myOrganizations, activeOrganization, loadingOrganization } = storeToRefs(userStore)

const showOrgSwitcherModal = ref(false)
const searchOpen = ref(false)

const hasMultipleOrganizations = computed(() => {
  return myOrganizations.value && myOrganizations.value.length > 1
})

// Dummy ref for sidebarOpen (not used in header, but required by composable)
const sidebarOpen = ref(false)

// Get navigation links for search groups
const { searchGroups } = useNavigationLinks(sidebarOpen)

const { modules, activeModuleId } = useModuleNavigation()

const moduleItems = computed(() => {
  return modules.value.map(module => ({
    ...module,
    active: module.id === activeModuleId.value
  }))
})

// Create a reactive locale ref that's properly initialized
const currentLocale = ref(locale.value)

// Watch for locale changes and handle them properly
watch(locale, (newLocale) => {
  currentLocale.value = newLocale
  setLocale(newLocale)
  console.log('Locale changed to:', newLocale)
  // No URL change needed with no_prefix strategy
}, { immediate: false })

// Watch currentLocale changes to update the global locale
watch(currentLocale, (newLocale) => {
  setLocale(newLocale)
  // No URL change needed with no_prefix strategy
})

// Impersonation state
const isImpersonating = computed(() => !!currentSession.value?.impersonatedBy)

// Stop impersonating function
const stopImpersonating = async () => {
  try {
    await authClient.admin.stopImpersonating()
    toast.add({
      title: t('common.success'),
      description: t('admin.user.impersonate.stopSuccess'),
      color: 'success'
    })
    // Reload dashboard page
    window.location.href = '/dashboard'
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : t('admin.user.impersonate.stopError')
    toast.add({
      title: t('common.error'),
      description: errorMessage,
      color: 'error'
    })
  }
}

</script>

<template>
  <!-- Impersonation Banner -->
  <div v-if="isImpersonating" class="sticky top-0 z-50">
    <UAlert
      color="warning"
      variant="soft"
      orientation="horizontal"
      :title="t('admin.user.impersonate.indicator')"
      :ui="{
        root: 'rounded-none py-2 px-4',
        wrapper: 'flex-1',
        title: 'text-sm font-medium',
        actions: 'ml-auto'
      }"
    >
      <template #actions>
        <UButton
          color="warning"
          variant="solid"
          size="sm"
          @click="stopImpersonating"
        >
          {{ t('admin.user.impersonate.stop') }}
        </UButton>
      </template>
    </UAlert>
  </div>

  <UHeader :ui="{ container: 'w-full max-w-none px-0' }">
    <template #left>
      <div class="flex items-center gap-3">
        <!-- Logo Icon -->
        <NuxtLink to="/" class="shrink-0">
          <div class="relative">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <!-- Background circle -->
              <circle cx="20" cy="20" r="20" fill="#75cbfe" />
              <!-- Building/facility icon -->
              <rect x="12" y="15" width="4" height="10" fill="white" rx="1" />
              <rect x="18" y="12" width="4" height="13" fill="white" rx="1" />
              <rect x="24" y="18" width="4" height="7" fill="white" rx="1" />
              <!-- Roof/peak -->
              <path d="M10 15 L20 8 L30 15 L28 15 L20 10 L12 15 Z" fill="white" />
              <!-- Door -->
              <rect x="18" y="20" width="2" height="5" fill="#75cbfe" />
            </svg>
          </div>
        </NuxtLink>

        <!-- ApexPro Title with Organization Name or Facility Services Subtitle -->
        <div class="flex flex-col">
          <span class="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
            ApexPro
          </span>
          <button
            v-if="isAuthenticated && activeOrganization && hasMultipleOrganizations"
            type="button"
            class="text-sm text-gray-600 dark:text-gray-400 leading-tight -mt-1 text-left hover:text-highlighted transition-colors"
            @click="showOrgSwitcherModal = true"
          >
            {{ activeOrganization.name }}
          </button>
          <span
            v-else-if="isAuthenticated && activeOrganization"
            class="text-sm text-gray-600 dark:text-gray-400 leading-tight -mt-1"
          >
            {{ activeOrganization.name }}
          </span>
          <span
            v-else-if="isAuthenticated && loadingOrganization"
            class="text-sm text-gray-400 leading-tight -mt-1 flex items-center gap-1"
          >
            <UIcon name="i-lucide-loader-2" class="w-3 h-3 animate-spin" />
            Loading...
          </span>
          <span v-else class="text-sm text-gray-600 dark:text-gray-400 leading-tight -mt-1">
            Facility Services
          </span>
        </div>
      </div>
    </template>

    <nav class="hidden lg:flex flex-1 items-center justify-center gap-6">
      <template v-for="module in moduleItems" :key="module.id">
        <NuxtLink :to="module.to" :class="[
          'text-sm font-medium transition-colors flex items-center gap-1.5',
          module.active
            ? 'text-primary font-semibold'
            : 'text-muted hover:text-highlighted'
        ]">
          <UIcon v-if="module.icon" :name="module.icon" class="w-4 h-4" />
          {{ module.label }}
        </NuxtLink>
      </template>
    </nav>

    <template #right>
      <div class="hidden lg:flex items-center gap-3 ml-auto">
        <UButton
          icon="i-lucide-search"
          color="neutral"
          variant="ghost"
          size="sm"
          square
          @click="searchOpen = true"
        />
        <ULocaleSelect v-model="currentLocale" :locales="[en, nl]" />
        <UColorModeButton />

        <!-- User Avatar Dropdown (only show when user is logged in) -->
        <AppUserMenu size="sm" />
      </div>

      <!-- Organization Switcher Modal -->
      <UModal v-model:open="showOrgSwitcherModal" title="Switch Organization" :ui="{ footer: 'justify-end' }">
        <template #body>
          <OrganizationSwitcher v-if="isAuthenticated" :show-create-button="false" @switched="showOrgSwitcherModal = false" />
        </template>
        <template #footer="{ close }">
          <UButton label="Close" color="neutral" variant="outline" @click="close" />
        </template>
      </UModal>
    </template>

    <template #body>
      <nav class="flex flex-col gap-2 -mx-2.5">
        <template v-for="module in moduleItems" :key="module.id">
          <NuxtLink :to="module.to" :class="[
            'text-sm font-medium transition-colors px-2.5 py-1.5 rounded-md flex items-center gap-2',
            module.active
              ? 'text-primary font-semibold bg-primary/10'
              : 'text-muted hover:text-highlighted hover:bg-gray-100 dark:hover:bg-gray-800'
          ]">
            <UIcon v-if="module.icon" :name="module.icon" class="w-4 h-4" />
            {{ module.label }}
          </NuxtLink>
        </template>
      </nav>

      <USeparator class="my-6" />

      <!-- Active Organization Display for Mobile -->
      <div v-if="isAuthenticated && (activeOrganization || loadingOrganization)" class="mb-4">
        <UButton
          v-if="loadingOrganization"
          variant="ghost"
          size="sm"
          disabled
          block
          class="text-muted"
        >
          <UIcon name="i-lucide-loader-2" class="w-4 h-4 animate-spin" />
        </UButton>
        <UButton
          v-else-if="activeOrganization"
          variant="ghost"
          size="sm"
          icon="i-lucide-building-2"
          block
          class="text-muted hover:text-highlighted"
          @click="showOrgSwitcherModal = true"
        >
          {{ activeOrganization.name }}
        </UButton>
      </div>

      <!-- User Avatar Dropdown for Mobile (only show when user is logged in) -->
      <div v-if="currentUser" class="mb-6">
        <AppUserMenu size="md" />
      </div>
      <UButton
        icon="i-lucide-search"
        color="neutral"
        variant="outline"
        size="sm"
        block
        class="mb-4"
        @click="searchOpen = true"
      >
        Search
      </UButton>
      <UFormField :label="t('nav.language')" name="language">
        <ULocaleSelect v-model="currentLocale" :locales="[en, nl]" class="w-48" />
      </UFormField>
      <UserMenu />
    </template>
  </UHeader>

  <!-- Dashboard Search Modal -->
  <UDashboardSearch
    v-model:open="searchOpen"
    :groups="searchGroups"
    :fuse="{
      fuseOptions: {
        ignoreLocation: true,
        threshold: 0.1,
        keys: ['label', 'suffix', '_searchText']
      }
    }"
  />
</template>
