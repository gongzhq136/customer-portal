<script setup lang="ts">
interface Props {
  title: string
  message: string
  messageParams?: Record<string, string | number>
  confirmText?: string
  cancelText?: string
  confirmColor?: 'primary' | 'error' | 'warning' | 'success' | 'info'
  confirmVariant?: 'solid' | 'outline' | 'ghost' | 'soft'
}

const props = withDefaults(defineProps<Props>(), {
  confirmText: undefined,
  cancelText: undefined,
  confirmColor: 'primary',
  confirmVariant: 'solid',
  messageParams: () => ({})
})

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const open = defineModel<boolean>('open', { default: false })
const { t } = useI18n()

const handleConfirm = () => {
  open.value = false
  emit('confirm')
}

const handleCancel = () => {
  open.value = false
  emit('cancel')
}

// Helper to check if a string is an i18n key (contains a dot)
const isI18nKey = (str: string): boolean => {
  return str.includes('.')
}

// Get translated or raw text
const getText = (key: string | undefined, fallback: string): string => {
  if (!key) return fallback
  if (isI18nKey(key)) {
    return t(key)
  }
  return key
}
</script>

<template>
  <UModal v-model:open="open" :title="getText(title, title)" :ui="{ footer: 'justify-end' }">
    <template #body>
      <div class="space-y-4">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          <template v-if="isI18nKey(props.message)">
            {{ t(props.message, props.messageParams) }}
          </template>
          <template v-else>
            {{ props.message }}
          </template>
        </p>
        <div class="flex gap-4 justify-end pt-4">
          <UButton
            type="button"
            variant="outline"
            @click="handleCancel"
          >
            {{ getText(props.cancelText, t('common.cancel')) }}
          </UButton>
          <UButton
            type="button"
            :color="confirmColor"
            :variant="confirmVariant"
            @click="handleConfirm"
          >
            {{ getText(props.confirmText, t('common.confirm')) }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
