<script setup lang="ts">
const state = reactive<{ [key: string]: boolean }>({
  email: true,
  desktop: false,
  product_updates: true,
  weekly_digest: false,
  important_updates: true
})

const sections = [{
  id: 'notification-channels',
  title: 'Notification channels',
  description: 'Where can we notify you?',
  fields: [{
    name: 'email',
    label: 'Email',
    description: 'Receive a daily email digest.'
  }, {
    name: 'desktop',
    label: 'Desktop',
    description: 'Receive desktop notifications.'
  }]
}, {
  id: 'account-updates',
  title: 'Account updates',
  description: 'Receive updates about Nuxt UI.',
  fields: [{
    name: 'weekly_digest',
    label: 'Weekly digest',
    description: 'Receive a weekly digest of news.'
  }, {
    name: 'product_updates',
    label: 'Product updates',
    description: 'Receive a monthly email with all new features and updates.'
  }, {
    name: 'important_updates',
    label: 'Important updates',
    description: 'Receive emails about important updates like security fixes, maintenance, etc.'
  }]
}]

async function onChange() {
  // Do something with data
  console.log(state)
}
</script>

<template>
  <div>
    <AppCard v-for="section in sections" :key="section.id" :title="section.title" :description="section.description"
      class="mb-4">
      <UPageCard class="mb-8" variant="subtle" :ui="{ container: 'divide-y divide-default' }">
        <UFormField v-for="field in section.fields" :key="field.name" :name="field.name" :label="field.label"
          :description="field.description" class="flex items-center justify-between not-last:pb-4 gap-2">
          <USwitch v-model="state[field.name]" @update:model-value="onChange" />
        </UFormField>
      </UPageCard>
    </AppCard>
  </div>
</template>
