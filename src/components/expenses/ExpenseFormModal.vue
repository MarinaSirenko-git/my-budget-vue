<template>
  <FormModal
    v-model="showModal"
    :title="isEditing ? t('expense_form_edit_title') : t('expense_form_title')"
  >
    <template #body>
      <div class="space-y-4">
        <!-- Category -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">
            {{ t('expense_form_category_label') }}
          </label>
          <TextInput
            v-model="formData.categoryName"
            :placeholder="t('expense_form_category_label')"
            :required="true"
          />
        </div>

        <!-- Amount -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">
            {{ t('expense_form_amount_label') }}
          </label>
          <CurrencyInput
            v-model="formData.amount"
            :placeholder="t('expense_form_amount_label')"
            :required="true"
            :currency="formData.currency || undefined"
            :locale="localeString"
            :min="0.01"
          />
        </div>

        <!-- Currency -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">
            {{ t('expense_form_currency_label') }}
          </label>
          <SelectInput
            v-model="formData.currency"
            :options="currencyOptions"
            :placeholder="t('select_currency_placeholder')"
            :searchable="true"
          />
        </div>

        <!-- Frequency -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">
            {{ t('expense_form_frequency_label') }}
          </label>
          <SelectInput
            v-model="formData.frequency"
            :options="frequencyOptions"
            :placeholder="t('expense_form_frequency_label')"
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
          {{ isSaving ? t('saving') : (isEditing ? t('expense_form_update') : t('expense_form_submit')) }}
        </button>
      </div>
    </template>
  </FormModal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useTranslation } from '@/i18n'
import { type ExpenseFormData } from '@/composables/useExpenseForm'
import { type CurrencyCode } from '@/constants/currency'
import { type FrequencyOption } from '@/constants/frequency'
import FormModal from '@/components/forms/FormModal.vue'
import TextInput from '@/components/forms/TextInput.vue'
import SelectInput from '@/components/forms/SelectInput.vue'
import CurrencyInput from '@/components/forms/CurrencyInput.vue'

interface Props {
  modelValue: boolean
  formData: ExpenseFormData
  isSaving: boolean
  canSubmit: boolean
  isEditing?: boolean
  localeString: string
  currencyOptions: Array<{ label: string; value: CurrencyCode }>
  frequencyOptions: FrequencyOption[]
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
