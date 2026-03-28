<script setup lang="ts">
import type { Organization } from '#types'

const { t } = useI18n()

const userStore = useUserStore()
const { activeOrganizationId, myOrganizations } = storeToRefs(userStore)
const { setActiveOrganizationId } = userStore
const toast = useToast()

// Type for organization with role
type OrganizationWithRole = Organization & { role?: string | null }

if (!userStore.isAdmin) {
  throw createError({ statusCode: 403, message: 'Access denied. You must be an admin to view this page.' })
}

// Page metadata
useSeoMeta({
  title: t('myOrganizations.title'),
  description: t('myOrganizations.description')
})

const isActiveOrganization = (organizationId: string) => {
  if (!activeOrganizationId.value) return false
  return activeOrganizationId.value === organizationId
}

const handleSetActive = async (organizationId: string) => {
  try {
    await setActiveOrganizationId(organizationId)
    toast.add({
      title: t('profile.messages.success'),
      description: t('profile.messages.organizationActivated'),
      color: 'success'
    })
  } catch (error) {
    console.error('Error setting active organization:', error)
    toast.add({
      title: t('profile.messages.error'),
      description: t('profile.messages.failedToActivateOrganization'),
      color: 'error'
    })
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Page Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
          {{ $t('myOrganizations.title') }}
        </h1>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-2">
          {{ $t('myOrganizations.description') }}
        </p>
      </div>

      <UCard>
        <template #header>
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
            {{ $t('profile.sections.organizations') }}
          </h2>
        </template>
        <div v-if="myOrganizations === null || myOrganizations === undefined">Loading...</div>
        <div v-else-if="myOrganizations.length === 0">No organizations found.</div>
        <div v-else class="space-y-6">
          <NuxtLink
            v-for="organization in myOrganizations"
            :key="organization.id"
            :to="`/admin/organizations/${organization.slug}?from=my-organizations`"
            class="flex items-start justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <div class="flex-1">
              <div class="flex items-center justify-between mb-1">
                <div class="flex items-center gap-2">
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ organization.name }}</h3>
                  <UBadge
                    v-if="(organization as OrganizationWithRole).role"
                    :color="(organization as OrganizationWithRole).role === 'owner' ? 'primary' : (organization as OrganizationWithRole).role === 'admin' ? 'info' : 'neutral'"
                    variant="soft"
                  >
                    {{ String((organization as OrganizationWithRole).role).charAt(0).toUpperCase() + String((organization as OrganizationWithRole).role).slice(1) }}
                  </UBadge>
                </div>
                <div class="flex items-center gap-2" @click.stop>
                  <UBadge v-if="isActiveOrganization(organization.id)" color="success" variant="subtle">
                    {{ $t('profile.badges.active') }}
                  </UBadge>
                  <UButton
                    v-else
                    size="sm"
                    variant="outline"
                    :loading="userStore.isLoading"
                    @click="handleSetActive(organization.id)"
                  >
                    {{ $t('profile.buttons.setActive') }}
                  </UButton>
                </div>
              </div>
              <p class="text-sm text-gray-600 dark:text-gray-400">{{ organization.slug }}</p>
              <p class="text-xs text-gray-500 mt-1">
                {{ $t('common.createdAt') }}: {{ new Date(organization.createdAt).toLocaleDateString() }}
              </p>
            </div>
          </NuxtLink>
        </div>
      </UCard>
    </div>
  </div>
</template>
