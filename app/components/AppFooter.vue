<script setup lang="ts">
const { t } = useI18n()

</script>

<template>
  <USeparator
    class="h-px"
  />

  <UFooter :ui="{ top: 'border-b border-default' }">
    <template #left>
      <p class="text-muted text-sm">
        © Ludulicious {{ new Date().getFullYear() }}. {{ t('footer.copyright') }}
      </p>
    </template>
  </UFooter>
</template>
