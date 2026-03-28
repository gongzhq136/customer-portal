# Modal Component Pattern

This document describes the standard pattern for creating and using modal components in this codebase.

## Overview

Modals are implemented as separate, reusable components that:
- Use `defineModel` for the `open` state
- Are conditionally rendered with `v-if` in the parent component
- Manage their own form state and validation
- Emit events for success/error handling

## Modal Component Structure

### 1. Component Setup

```html
<script setup lang="ts">
import type { YourDataType } from '#types'

// Props - data needed by the modal
const props = defineProps<{
  user: YourDataType | null  // Example: user data
}>()

// Events - communicate back to parent
const emit = defineEmits<{
  success: []                    // Emitted on successful operation
  error: [message: string]       // Emitted on error (optional)
}>()

// Modal open state using defineModel
const open = defineModel<boolean>('open', { default: false })

// Composables
const { t } = useI18n()
const toast = useToast()

// Form schema (if using forms)
const formSchema = computed(() => z.object({
  // Your validation schema
}))

// Form state
const form = reactive({
  // Your form fields
})

// Note: No need to watch 'open' to reset form state!
// Since parent uses v-if, component is destroyed/recreated each time
// Form state automatically resets to initial values

// Submit handler
const handleSubmit = async (event: FormSubmitEvent<FormType>) => {
  if (!props.user) return

  try {
    // Perform operation
    const { error } = await someApiCall({
      userId: props.user.id,
      data: event.data
    })

    if (error) {
      throw error
    }

    // Success
    toast.add({
      title: t('common.success'),
      description: t('operation.success'),
      color: 'success'
    })
    open.value = false
    emit('success')
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : t('operation.error')
    toast.add({
      title: t('common.error'),
      description: errorMessage,
      color: 'error'
    })
    emit('error', errorMessage)
  }
}
</script>

<template>
  <!-- Use v-model:open directly on UModal, NOT v-if -->
  <UModal v-model:open="open" :title="t('modal.title')" :ui="{ footer: 'justify-end' }">
    <template #body>
      <!-- Modal content -->
      <UForm :state="form" :schema="formSchema" @submit="handleSubmit">
        <!-- Form fields -->
      </UForm>
    </template>
  </UModal>
</template>
```

### 2. Key Points

#### `defineModel` for Open State
```ts
const open = defineModel<boolean>('open', { default: false })
```
- Creates a two-way binding for the `open` prop
- Parent can use `v-model:open` to control the modal
- Modal can set `open.value = false` to close itself

#### Conditional Rendering in Parent
```html
<!-- Parent component -->
<template>
  <YourModal
    v-if="showModal"
    v-model:open="showModal"
    :user="selectedUser"
    @success="handleSuccess"
  />
</template>
```
- Use `v-if` to conditionally render the entire component
- This ensures the component is created/destroyed, not just hidden
- Helps with form state management and cleanup

#### Form State Reset
```typescript
// No watch needed! v-if in parent destroys/recreates component
// Form state automatically resets to initial values each time
```
- **No watch needed** - Since parent uses `v-if`, the component is destroyed and recreated
- Form state automatically resets to initial values on each open
- This is why `v-if` is preferred over `v-show` for modals

#### Event Emission
```typescript
emit('success')           // Notify parent of success
emit('error', message)    // Notify parent of error (optional)
```
- Parent can listen to `@success` to refresh data
- Parent can listen to `@error` for custom error handling
- Toast notifications are handled inside the modal

## Parent Component Pattern

### 1. State Management

```html
<script setup lang="ts">
// Modal visibility state
const showModal = ref(false)

// Selected item for the modal
const selectedItem = ref<DataType | null>(null)

// Open modal function
const openModal = (item: DataType) => {
  selectedItem.value = item
  showModal.value = true
}

// Success handler (optional)
const handleSuccess = async () => {
  await refreshData()  // Reload data after successful operation
}
</script>
```

### 2. Template Usage

```html
<template>
  <!-- Trigger button -->
  <UButton @click="openModal(item)">
    Open Modal
  </UButton>

  <!-- Modal component -->
  <YourModal
    v-if="showModal"
    v-model:open="showModal"
    :user="selectedItem"
    @success="handleSuccess"
  />
</template>
```

## Naming Conventions

### Component Files
- Use PascalCase: `BanUserModal.vue`
- Prefix with feature area if needed: `AdminBanUserModal.vue`
- Place in the same directory as parent component or a `modals/` subdirectory

### Component Registration
- Nuxt auto-imports components, so `BanUserModal.vue` becomes `<BanUserModal>`
- If using prefixes, ensure consistency: `<AdminBanUserModal>`

## Complete Example

### Modal Component (`BanUserModal.vue`)

```html
<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { AdminUserResponse } from '#types'
import { authClient } from '~/utils/auth-client'

const props = defineProps<{
  user: AdminUserResponse | null
}>()

const emit = defineEmits<{
  success: []
  error: [message: string]
}>()

const open = defineModel<boolean>('open', { default: false })
const { t } = useI18n()
const toast = useToast()

const formSchema = computed(() => z.object({
  reason: z.string().optional()
}))

const form = reactive({
  reason: ''
})

// No watch needed - component is recreated each time due to v-if in parent

const handleSubmit = async (event: FormSubmitEvent<z.output<typeof formSchema.value>>) => {
  if (!props.user) return

  try {
    const { error } = await authClient.admin.banUser({
      userId: props.user.id,
      banReason: event.data.reason
    })

    if (error) throw error

    toast.add({
      title: t('common.success'),
      description: t('admin.user.ban.success'),
      color: 'success'
    })
    open.value = false
    emit('success')
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : t('admin.user.ban.error')
    toast.add({
      title: t('common.error'),
      description: errorMessage,
      color: 'error'
    })
    emit('error', errorMessage)
  }
}
</script>

<template>
  <UModal v-model:open="open" :title="t('admin.user.ban.title')" :ui="{ footer: 'justify-end' }">
    <template #body>
      <UForm :state="form" :schema="formSchema" @submit="handleSubmit">
        <UFormField name="reason" :label="t('admin.user.ban.reason')">
          <UTextarea v-model="form.reason" />
        </UFormField>
        <div class="flex gap-4 justify-end pt-4">
          <UButton type="button" variant="outline" @click="open = false">
            {{ t('common.cancel') }}
          </UButton>
          <UButton type="submit" color="error">
            {{ t('admin.user.ban.confirm') }}
          </UButton>
        </div>
      </UForm>
    </template>
  </UModal>
</template>
```

### Parent Component (`users.vue`)

```html
<script setup lang="ts">
const showBanModal = ref(false)
const selectedUser = ref<AdminUserResponse | null>(null)

const openBanModal = (user: AdminUserResponse) => {
  selectedUser.value = user
  showBanModal.value = true
}

const handleBanSuccess = async () => {
  await loadUsers()  // Refresh user list
}
</script>

<template>
  <UButton @click="openBanModal(user)">
    Ban User
  </UButton>

  <BanUserModal
    v-if="showBanModal"
    v-model:open="showBanModal"
    :user="selectedUser"
    @success="handleBanSuccess"
  />
</template>
```

## Best Practices

1. **Always use `v-if` in parent**: Conditionally render the entire component, not just hide it
   - This destroys/recreates the component, ensuring clean state
   - No need to manually reset form state
2. **Use `defineModel` for open state**: Provides clean two-way binding
3. **Emit success events**: Let parent handle data refresh after successful operations
4. **Handle errors internally**: Show toast notifications inside the modal
5. **Keep modals focused**: One modal = one operation
6. **Use TypeScript**: Properly type props, emits, and form data
7. **Consistent naming**: Use clear, descriptive names with prefixes if needed
8. **Don't use `v-show`**: Use `v-if` to ensure component recreation and clean state

## Common Patterns

### Simple Confirmation Modal
```html
<UModal v-model:open="open" :title="t('confirm.title')">
  <template #body>
    <p>{{ t('confirm.message') }}</p>
  </template>
  <template #footer>
    <UButton variant="outline" @click="open = false">Cancel</UButton>
    <UButton @click="handleConfirm">Confirm</UButton>
  </template>
</UModal>
```

### Form Modal with Validation
```html
<UModal v-model:open="open" :title="t('form.title')">
  <template #body>
    <UForm :state="form" :schema="schema" @submit="handleSubmit">
      <!-- Form fields -->
    </UForm>
  </template>
</UModal>
```

### Modal with Loading State
```html
<UModal v-model:open="open" :title="t('modal.title')">
  <template #body>
    <div v-if="loading">Loading...</div>
    <div v-else>
      <!-- Content -->
    </div>
  </template>
</UModal>
```

## Troubleshooting

### Modal doesn't close
- Ensure `open.value = false` is called after successful operation
- Check that `v-model:open` is correctly bound in parent

### Form state persists between opens
- Ensure `v-if` is used (not `v-show`) in parent component
- `v-if` destroys/recreates component, automatically resetting form state
- If using `v-show`, you'd need a watch, but `v-if` is preferred

### Events not firing
- Verify `emit('success')` is called after successful operation
- Check parent has `@success` handler attached

### Component not found
- Ensure component file follows naming convention
- Check Nuxt auto-import is working (restart dev server if needed)

