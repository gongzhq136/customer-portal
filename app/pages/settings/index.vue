<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const { t } = useI18n()

const userStore = useUserStore()
const { currentUser } = storeToRefs(userStore)
const { setCurrentUser } = userStore
const toast = useToast()

const fileRef = ref<HTMLInputElement>()

// Zod schema for profile form validation
const schema = z.object({
  name: z.string()
    .trim()
    .min(1, t('profile.validation.nameRequired'))
    .max(255, t('profile.validation.nameMaxLength')),
  image: z.union([
    z.string().url(t('profile.validation.imageInvalidUrl')),
    z.literal('').transform(() => null),
    z.null()
  ]).optional()
}).refine(
  (data) => data.name !== undefined || data.image !== undefined,
  {
    message: t('profile.validation.atLeastOneField')
  }
)

type Schema = z.output<typeof schema>

// Form state
const form = reactive<Partial<Schema>>({
  name: '',
  image: ''
})

const isLoading = ref(false)
const isDirty = ref(false)
const selectedFile = ref<File | null>(null)

// Initialize form with current user data
watchEffect(() => {
  if (currentUser.value) {
    form.name = currentUser.value.name || ''
    form.image = currentUser.value.image || ''
    isDirty.value = false
  }
})

// Watch for form changes
watch(() => [form.name, form.image], () => {
  if (currentUser.value) {
    const nameChanged = form.name !== (currentUser.value.name || '')
    const imageChanged = form.image !== (currentUser.value.image || '')
    isDirty.value = nameChanged || imageChanged
  }
}, { deep: true })

// Page metadata
useSeoMeta({
  title: t('profile.title'),
  description: t('profile.description')
})

const handleSubmit = async (event: FormSubmitEvent<Schema>) => {
  if (!currentUser.value) return

  isLoading.value = true
  try {
    let imageUrl = event.data.image === null || event.data.image === '' ? null : event.data.image

    // If a file was selected, convert it to base64 data URL
    if (selectedFile.value) {
      const reader = new FileReader()
      imageUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(selectedFile.value!)
      })
    }

    const response = await $fetch<{
      success: boolean
      message: string
      user?: {
        id: string
        name: string
        email: string
        image: string | null
      }
    }>('/api/profile', {
      method: 'PATCH',
      body: {
        name: event.data.name?.trim(),
        image: imageUrl
      }
    })

    if (response.success && response.user) {
      // Update the user store with new data
      setCurrentUser({
        ...currentUser.value,
        name: response.user.name,
        image: response.user.image || undefined
      })

      toast.add({
        title: t('profile.messages.success'),
        description: t('profile.messages.profileUpdated'),
        color: 'success'
      })

      isDirty.value = false
      selectedFile.value = null
      // Revoke the blob URL if it was created
      if (form.image && form.image.startsWith('blob:')) {
        URL.revokeObjectURL(form.image)
      }
      // Update form.image with the saved URL
      form.image = response.user.image || ''
    }
  } catch (error: unknown) {
    console.error('Error updating profile:', error)
    const errorMessage = (error as { data?: { message?: string }, message?: string })?.data?.message
      || (error as { message?: string })?.message
      || t('profile.messages.updateFailed')
    toast.add({
      title: t('profile.messages.error'),
      description: errorMessage,
      color: 'error'
    })
  } finally {
    isLoading.value = false
  }
}

const handleReset = () => {
  if (currentUser.value) {
    // Revoke blob URL if it exists
    if (form.image && form.image.startsWith('blob:')) {
      URL.revokeObjectURL(form.image)
    }
    form.name = currentUser.value.name || ''
    form.image = currentUser.value.image || ''
    isDirty.value = false
    selectedFile.value = null
    if (fileRef.value) {
      fileRef.value.value = ''
    }
  }
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement

  if (!input.files?.length) {
    return
  }

  const file = input.files[0]!

  // Revoke previous blob URL if it exists
  if (form.image && form.image.startsWith('blob:')) {
    URL.revokeObjectURL(form.image)
  }

  selectedFile.value = file

  // Create preview URL
  form.image = URL.createObjectURL(file)
  isDirty.value = true
}

function onFileClick() {
  fileRef.value?.click()
}

// Cleanup blob URLs on unmount
onUnmounted(() => {
  if (form.image && form.image.startsWith('blob:')) {
    URL.revokeObjectURL(form.image)
  }
})
</script>

<template>
  <AppCard class="mb-8" :title="$t('profile.sections.profileInfo')">
    <UForm :state="form" :schema="schema" class="space-y-6" @submit="handleSubmit">
      <!-- Profile Picture Section -->
      <UFormField :label="$t('profile.fields.profilePicture')"
        :description="$t('profile.fields.profilePictureDescription')" name="image"
        class="flex max-sm:flex-col justify-between sm:items-center gap-4">
        <div class="flex flex-wrap items-center gap-3">
          <UAvatar :src="form.image || undefined" :alt="form.name || currentUser?.email || 'User'"
            :text="form.name ? form.name.charAt(0).toUpperCase() : (currentUser?.email?.charAt(0).toUpperCase() || 'U')"
            size="xl" class="ring-2 ring-gray-200 dark:ring-gray-700" />
          <UButton :label="$t('profile.fields.chooseAvatar')" color="primary" variant="outline" @click="onFileClick" />
          <input ref="fileRef" type="file" class="hidden" accept=".jpg, .jpeg, .png, .gif" @change="onFileChange">
        </div>
      </UFormField>

      <UFormField :label="$t('profile.fields.name')" :description="$t('profile.fields.nameDescription')" name="name"
        required>
        <UInput v-model="form.name" type="text" :placeholder="$t('profile.fields.namePlaceholder')" icon="i-lucide-user"
          class="w-full" required />
      </UFormField>

      <UFormField :label="$t('profile.fields.email')" :description="$t('profile.fields.emailDescription')" name="email">
        <UInput :model-value="currentUser?.email || ''" type="email" disabled icon="i-lucide-mail" class="w-full" />
      </UFormField>

      <!-- Form Actions -->
      <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <UButton type="button" variant="ghost" color="neutral" :disabled="!isDirty || isLoading" @click="handleReset">
          {{ $t('common.reset') }}
        </UButton>
        <UButton type="submit" :loading="isLoading" :disabled="!isDirty">
          {{ $t('common.save') }}
        </UButton>
      </div>
    </UForm>
  </AppCard>
</template>
