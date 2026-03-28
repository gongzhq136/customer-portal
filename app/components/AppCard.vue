<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <UCard>
    <template #header>
      <div>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
          {{ title }}
        </h2>
        <h6 v-if="description" class="text-sm text-gray-600 dark:text-gray-400">
          {{ description }}
        </h6>
      </div>
    </template>
    <slot />
  </UCard>
</template>
