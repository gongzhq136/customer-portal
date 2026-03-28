<script setup lang="ts">
const route = useRoute()
const showFooter = computed(() => route.meta?.public === true)
</script>

<template>
  <div>
    <AppHeader :show-navigation="true" />

    <UMain class="main-content">
      <slot />
    </UMain>

    <AppFooter v-if="showFooter" />
  </div>
</template>
