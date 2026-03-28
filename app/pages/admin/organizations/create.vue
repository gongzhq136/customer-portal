<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { ApiError } from '#types'
import { useOrganization } from '~/composables/useOrganization'

const userStore = useUserStore()
const { isAdmin } = storeToRefs(userStore)

// Redirect if not admin
if (!isAdmin.value) {
  throw createError({ statusCode: 403, message: 'Admin access required' })
}

const { t } = useI18n()
const router = useRouter()
const { createOrganization } = useOrganization()
const loading = ref(false)
const error = ref('')
const formData = ref({
  name: '',
  slug: ''
})

const schema = computed(() => z.object({
  name: z.string().min(1, t('admin.organization.create.validation.nameRequired')),
  slug: z.string().min(1, t('admin.organization.create.validation.slugRequired')).regex(/^[a-z0-9-]+$/, t('admin.organization.create.validation.slugInvalid'))
}))

type Schema = {
  name: string
  slug: string
}

// Auto-generate slug from name
watch(() => formData.value.name, (name) => {
  if (name) {
    formData.value.slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }
})

const handleSubmit = async (event: FormSubmitEvent<Schema>) => {
  try {
    loading.value = true
    error.value = ''

    const result = await createOrganization({
      name: event.data.name,
      slug: event.data.slug
    })

    if (result.error) {
      throw new Error(result.error.message || t('admin.organization.create.errors.createFailed'))
    }

    // Redirect to organization detail page using slug
    await router.push(`/admin/organizations/${event.data.slug}`)
  } catch (err: unknown) {
    const apiError = err as ApiError
    error.value = apiError.message || t('admin.organization.create.errors.createFailed')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
    <UContainer class="max-w-2xl">
      <UCard>
        <template #header>
          <div class="flex items-center gap-4">
            <UButton
              icon="i-lucide-arrow-left"
              variant="ghost"
              size="sm"
              :to="'/admin/organizations'"
            >
              {{ t('admin.organization.create.back') }}
            </UButton>
            <h1 class="text-2xl font-bold">{{ t('admin.organization.create.title') }}</h1>
          </div>
        </template>

        <UForm :schema="schema" :state="formData" class="space-y-6" @submit="handleSubmit">
          <UFormField name="name" :label="t('admin.organization.create.name')" required>
            <UInput
              v-model="formData.name"
              :placeholder="t('admin.organization.create.namePlaceholder')"
              size="lg"
              class="w-full"
            />
          </UFormField>

          <UFormField name="slug" :label="t('admin.organization.create.slug')" required>
            <UInput
              v-model="formData.slug"
              :placeholder="t('admin.organization.create.slugPlaceholder')"
              size="lg"
              class="w-full"
            />
            <template #hint>
              {{ t('admin.organization.create.slugHint') }}
            </template>
          </UFormField>

          <UAlert
            v-if="error"
            color="error"
            variant="soft"
            :title="error"
            class="mb-4"
          />

          <div class="flex flex-col sm:flex-row gap-4">
            <UButton
              type="submit"
              :loading="loading"
              color="primary"
              size="lg"
              class="flex-1"
            >
              {{ t('admin.organization.create.createButton') }}
            </UButton>
            <UButton
              type="button"
              variant="outline"
              size="lg"
              class="flex-1"
              @click="router.push('/admin/organizations')"
            >
              {{ t('admin.organization.create.cancel') }}
            </UButton>
          </div>
        </UForm>
      </UCard>
    </UContainer>
  </div>
</template>
