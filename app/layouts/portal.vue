<script setup lang="ts">
const route = useRoute()
const showFooter = computed(() => route.meta?.public === true)
</script>

<template>
  <div class="max-w-7xl mx-auto">
    <AppHeader />

    <UMain class="main-content">
      <slot />
    </UMain>

    <AppFooter v-if="showFooter" />
  </div>
</template>
