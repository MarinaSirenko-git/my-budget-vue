<template>
  <FormModal
    v-model="showModal"
    :title="isEditing ? t('goal_form_edit_title') : t('goal_form_title')"
  >
    <template #body>
      <div class="space-y-4">
        <!-- Name -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">
            {{ t('goal_form_name_label') }}
          </label>
          <TextInput
            v-model="formData.name"
            :placeholder="t('goal_form_name_label')"
            :required="true"
          />
        </div>

        <!-- Target Amount -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">
            {{ t('goal_form_amount_label') }}
          </label>
          <CurrencyInput
            v-model="formData.targetAmount"
            :placeholder="t('goal_form_amount_label')"
            :required="true"
            :currency="formData.currency || undefined"
            :locale="localeString"
            :min="0.01"
          />
        </div>

        <!-- Currency -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">
            {{ t('goal_form_currency_label') }}
          </label>
          <SelectInput
            v-model="formData.currency"
            :options="currencyOptions"
            :placeholder="t('select_currency_placeholder')"
            :searchable="true"
          />
        </div>

        <!-- Target Date -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">
            {{ t('goal_form_target_date_label') }}
          </label>
          <input
            v-model="formData.targetDate"
            type="date"
            :min="minDate"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
            :required="true"
          />
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <button
          type="button"
          class="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
          @click="handleCloseModal"
        >
          {{ t('cancel') }}
        </button>
        <button
          type="button"
          class="px-4 py-2 text-sm rounded-lg bg-black text-white hover:bg-gray-900 transition disabled:opacity-60 disabled:cursor-not-allowed"
          :disabled="!canSubmit || isSaving"
          @click="handleSubmit"
        >
          {{ isSaving ? (t('saving') || 'Saving...') : (isEditing ? t('goal_form_update') : t('goal_form_submit')) }}
        </button>
      </div>
    </template>
  </FormModal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useTranslation } from '@/i18n'
import { type CurrencyCode } from '@/constants/currency'
import FormModal from '@/components/forms/FormModal.vue'
import TextInput from '@/components/forms/TextInput.vue'
import SelectInput from '@/components/forms/SelectInput.vue'
import CurrencyInput from '@/components/forms/CurrencyInput.vue'

export interface GoalFormData {
  name: string
  targetAmount: number | null
  currency: CurrencyCode | null
  targetDate: string | null
}

interface Props {
  modelValue: boolean
  formData: GoalFormData
  isSaving: boolean
  canSubmit: boolean
  isEditing?: boolean
  localeString: string
  currencyOptions: Array<{ label: string; value: CurrencyCode }>
  minDate: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'close'): void
  (e: 'submit'): void
}>()

const { t } = useTranslation()

const showModal = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const handleCloseModal = () => {
  emit('close')
  showModal.value = false
}

const handleSubmit = () => {
  emit('submit')
}
</script>
