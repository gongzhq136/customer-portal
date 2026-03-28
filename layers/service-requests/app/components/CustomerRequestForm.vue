<script setup lang="ts">
import { z } from 'zod'

const props = defineProps<{
  initialData?: Partial<ServiceRequest>
  loading?: boolean
}>()

const { t } = useI18n()

const emit = defineEmits<{
  submit: [data: ServiceRequestCreateInput]
  cancel: []
}>()

const editMode = computed(() => !!props.initialData?.id)

const state = reactive({
  title: props.initialData?.title || '',
  description: props.initialData?.description || '',
  priority: props.initialData?.priority || 'MEDIUM',
  category: props.initialData?.category || ''
})

watch(
  () => props.initialData,
  (data) => {
    state.title = data?.title || ''
    state.description = data?.description || ''
    state.priority = data?.priority || 'MEDIUM'
    state.category = data?.category || ''
  }
)

const schema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(5000),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  category: z.string().max(100).optional()
})

const { priorityOptions, getStatusBadgeText, getStatusColor } = useServiceRequests()

const handleSubmit = () => {
  emit('submit', state)
}
</script>

<template>
  <UForm :state="state" :schema="schema" class="w-full" @submit="handleSubmit">
    <!-- Wrap in real DOM nodes so spacing is guaranteed -->
    <div class="space-y-6">
      <div>
        <UFormField :label="t('serviceRequest.fields.title')" name="title" required>
          <UInput
            v-model="state.title"
            :placeholder="t('serviceRequest.fields.title')"
            class="w-full"
            size="lg"
          />
        </UFormField>
      </div>

      <div>
        <UFormField :label="t('serviceRequest.fields.description')" name="description" required class="w-full">
          <UTextarea
            v-model="state.description"
            class="w-full"
            :placeholder="t('serviceRequest.fields.description')"
            :rows="7"
            size="lg"
          />
        </UFormField>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <UFormField :label="t('serviceRequest.fields.priority')" name="priority" class="w-full">
            <USelect
              v-model="state.priority"
              class="w-full"
              :items="priorityOptions.filter(i => i.value !== undefined)"
              size="lg"
            />
          </UFormField>
        </div>

        <div>
          <UFormField :label="t('serviceRequest.fields.category')" name="category" class="w-full">
            <UInput
              v-model="state.category"
              class="w-full"
              placeholder="e.g., Technical, Billing, General"
              size="lg"
            />
          </UFormField>
        </div>
      </div>

      <div
        v-if="editMode && props.initialData?.status"
        class="rounded-lg border border-default bg-elevated/20 p-4"
      >
        <div class="flex items-center justify-between gap-3">
          <div class="text-sm font-medium text-muted">
            {{ t('serviceRequest.fields.status') }}
          </div>
          <UBadge :color="getStatusColor(props.initialData.status)" variant="soft">
            {{ getStatusBadgeText(props.initialData.status) }}
          </UBadge>
        </div>
      </div>

      <div class="pt-4 border-t border-default">
        <div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <UButton
            type="button"
            variant="outline"
            size="lg"
            :disabled="loading"
            @click="$emit('cancel')"
          >
            {{ t('common.cancel') }}
          </UButton>
          <UButton
            type="submit"
            color="primary"
            size="lg"
            :loading="loading"
          >
            {{ editMode ? t('common.save') : t('common.create') }}
          </UButton>
        </div>
      </div>
    </div>
  </UForm>
</template>
