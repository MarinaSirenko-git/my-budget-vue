<template>
  <FormModal
    v-model="showModal"
    :title="isEditing ? t('income_form_edit_title') : t('income_form_title')"
  >
    <template #body>
      <div class="space-y-4">
        <!-- Category -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">
            {{ t('income_form_category_label') }}
          </label>
          <TextInput
            v-model="formData.categoryName"
            :placeholder="t('income_form_category_label')"
            :required="true"
          />
        </div>

        <!-- Amount -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">
            {{ t('income_form_amount_label') }}
          </label>
          <CurrencyInput
            v-model="formData.amount"
            :placeholder="t('income_form_amount_label')"
            :required="true"
            :currency="formData.currency || undefined"
            :locale="localeString"
            :min="0.01"
          />
        </div>

        <!-- Currency -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">
            {{ t('income_form_currency_label') }}
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
            {{ t('income_form_frequency_label') }}
          </label>
          <SelectInput
            v-model="formData.frequency"
            :options="frequencyOptions"
            :placeholder="t('income_form_frequency_label')"
          />
        </div>

        <!-- Payment Day -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">
            {{ t('income_form_date_label') }}
          </label>
          <SelectInput
            v-model="formData.paymentDay"
            :options="dayOptions"
            :placeholder="t('income_form_date_label')"
            :helper-text="t('income_form_date_helper')"
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
          {{ isSaving ? t('saving') : (isEditing ? t('income_form_update') : t('income_form_submit')) }}
        </button>
      </div>
    </template>
  </FormModal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useTranslation } from '@/i18n'
import { type IncomeFormData } from '@/composables/useIncomeForm'
import { type CurrencyCode } from '@/constants/currency'
import { type FrequencyOption } from '@/constants/frequency'
import FormModal from '@/components/forms/FormModal.vue'
import TextInput from '@/components/forms/TextInput.vue'
import SelectInput from '@/components/forms/SelectInput.vue'
import CurrencyInput from '@/components/forms/CurrencyInput.vue'

interface Props {
  modelValue: boolean
  formData: IncomeFormData
  isSaving: boolean
  canSubmit: boolean
  isEditing?: boolean
  localeString: string
  currencyOptions: Array<{ label: string; value: CurrencyCode }>
  frequencyOptions: FrequencyOption[]
  dayOptions: Array<{ label: string; value: string }>
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


