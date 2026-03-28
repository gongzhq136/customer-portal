<script setup lang="ts">
const props = withDefaults(defineProps<{
  title?: string
  description?: string
  success?: string
  error?: string
  showLogo?: boolean
}>(), {
  title: '',
  description: '',
  success: '',
  error: '',
  showLogo: true
})
</script>

<template>
  <div>
    <UAlert v-if="props.success" color="success" variant="soft" :description="props.success" />
    <UAlert v-if="props.error" color="error" variant="soft" :description="props.error" />
    <UPageCard variant="subtle" class="max-w-sm w-full mt-10 space-y-6 text-center">
      <template v-if="props.title" #title>
        <div class="flex justify-center mb-10">
          <AppLogo class="w-auto h-6 shrink-0" />
        </div>
        <h2 class="text-2xl text-center">{{ props.title }}</h2>
      </template>
      <template v-if="props.description" #description>
        <div class="text-center text-sm text-gray-500 mb-5">
          {{ props.description }}
        </div>
      </template>
      <slot />
    </UPageCard>
  </div>
</template>
