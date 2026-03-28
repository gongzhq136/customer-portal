<script setup lang="ts">
import { authClient } from '~/utils/auth-client'
import type { SelectItem } from '@nuxt/ui'

interface Props {
  /** Whether to show in compact/header mode without card wrapper */
  compact?: boolean
  /** Whether to show the create button */
  showCreateButton?: boolean
}

withDefaults(defineProps<Props>(), {
  compact: false,
  showCreateButton: true,
})

const emit = defineEmits<{
  switched: []
}>()

const toast = useToast()
const { t } = useI18n()
const userStore = useUserStore()
const { activeOrganizationId } = storeToRefs(userStore)
const selectedOrg = ref('')
const error = ref('')
const organizations = authClient.useListOrganizations()

// Sync selectedOrg with activeOrganizationId from store
watch(activeOrganizationId, (newOrgId) => {
  if (newOrgId && newOrgId !== selectedOrg.value) {
    selectedOrg.value = newOrgId
  }
}, { immediate: true })

// Also watch for when organizations load and set initial value
watch(() => organizations.value.data, (orgs) => {
  if (orgs && activeOrganizationId.value && !selectedOrg.value) {
    selectedOrg.value = activeOrganizationId.value
  }
}, { immediate: true })

// Check if user has any organizations
const hasOrgs = computed(() => {
  return organizations.value.data && organizations.value.data.length > 0
})

const selectItems = computed<SelectItem[]>(() => {
  if (!organizations.value.data) return []
  return organizations.value.data.map(org => ({
    label: org.name,
    value: org.id,
  }))
})

const switchOrganization = async (value: unknown) => {
  if (!value || typeof value !== 'string') return

  try {
    // Update the store's activeOrganizationId (this also calls authClient.organization.setActive)
    await userStore.setActiveOrganizationId(value)
    emit('switched')
    navigateTo('/dashboard')
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to switch organization'
    error.value = errorMessage
    toast.add({
      title: t('common.error'),
      description: errorMessage,
      color: 'error'
    })
  }
}

const createNewOrg = () => {
  // Navigate to organization creation page or show modal
  navigateTo('/organizations/create')
}
</script>

<template>
  <div :class="compact ? '' : 'organization-switcher-wrapper'">
    <!-- Full version (for modal or standalone use) -->
    <div v-if="!compact">
      <div v-if="organizations.isPending || organizations.isRefetching" class="space-y-2">
        <USkeleton class="h-10 w-full" />
        <USkeleton v-if="showCreateButton" class="h-10 w-full" />
      </div>
      <div v-else-if="organizations.error" class="space-y-4">
        <UAlert
          color="error"
          variant="soft"
          :title="t('common.error')"
          :description="organizations.error?.message || 'Failed to load organizations'"
          icon="i-lucide-alert-circle"
        />
      </div>
      <div v-else class="flex flex-col gap-4">
        <UFormField label="Select Organization" name="organization">
          <USelect
            id="org-select"
            v-model="selectedOrg"
            :items="selectItems"
            placeholder="Select Organization"
            value-key="value"
            class="w-full"
            @update:model-value="switchOrganization"
          />
        </UFormField>
        <UButton
          v-if="showCreateButton"
          color="primary"
          variant="solid"
          block
          icon="i-lucide-plus"
          @click="createNewOrg"
        >
          Create New Organization
        </UButton>
      </div>
    </div>

    <!-- Compact version for header -->
    <div v-else>
      <div v-if="organizations.isPending || organizations.isRefetching">
        <USkeleton class="h-9 w-48" />
      </div>
      <div v-else-if="organizations.error" class="hidden">
        <!-- Silently fail in compact mode -->
      </div>
      <div v-else-if="hasOrgs" class="flex items-center gap-2">
        <USelect
          id="org-select-header"
          v-model="selectedOrg"
          :items="selectItems"
          placeholder="Organization"
          value-key="value"
          size="sm"
          class="min-w-[160px]"
          @update:model-value="switchOrganization"
        />
        <UButton
          v-if="showCreateButton"
          color="primary"
          variant="ghost"
          size="sm"
          icon="i-lucide-plus"
          :ui="{ base: 'p-1.5' }"
          @click="createNewOrg"
        />
      </div>
    </div>
  </div>
</template>
