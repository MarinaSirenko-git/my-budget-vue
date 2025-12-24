<template>
  <FormModal
    v-model="showModal"
    :title="isEditing ? t('savings_form_edit_title') : t('savings_form_title')"
  >
    <template #body>
      <div class="space-y-4">
        <!-- Name -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">
            {{ t('savings_form_name_label') }}
          </label>
          <TextInput
            v-model="formData.name"
            :placeholder="t('savings_form_name_label')"
            :required="true"
          />
        </div>

        <!-- Amount -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">
            {{ t('savings_form_amount_label') }}
          </label>
          <CurrencyInput
            v-model="formData.amount"
            :placeholder="t('savings_form_amount_label')"
            :required="true"
            :currency="formData.currency || undefined"
            :locale="localeString"
            :min="0.01"
          />
        </div>

        <!-- Currency -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">
            {{ t('savings_form_currency_label') }}
          </label>
          <SelectInput
            v-model="formData.currency"
            :options="currencyOptions"
            :placeholder="t('select_currency_placeholder')"
            :searchable="true"
          />
        </div>

        <!-- Interest Checkbox -->
        <div class="space-y-2">
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              v-model="formData.earningInterest"
              type="checkbox"
              class="w-4 h-4 text-black border-gray-300 rounded focus:ring-2 focus:ring-black focus:ring-offset-0"
            />
            <span class="text-sm font-medium text-gray-700">
              {{ t('savings_form_interest_label') }}
            </span>
          </label>
        </div>

        <!-- Interest Rate -->
        <div v-if="formData.earningInterest" class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">
            {{ t('savings_form_interest_rate_label') }}
          </label>
          <TextInput
            v-model="formData.interestRate"
            type="number"
            :placeholder="t('savings_form_interest_rate_label')"
            :required="true"
          />
        </div>

        <!-- Capitalization Period -->
        <div v-if="formData.earningInterest" class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">
            {{ t('savings_form_capitalization_period_label') }}
          </label>
          <SelectInput
            v-model="formData.capitalizationPeriod"
            :options="capitalizationPeriodOptions"
            :placeholder="t('savings_form_capitalization_period_label')"
            :required="true"
          />
        </div>

        <!-- Deposit Date -->
        <div v-if="formData.earningInterest" class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">
            {{ t('savings_form_deposit_date_label') }}
          </label>
          <input
            v-model="formData.depositDate"
            type="date"
            :max="maxDate"
            :min="minDate"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
            :required="formData.earningInterest"
          />
          <p v-if="t('savings_form_deposit_date_helper')" class="text-xs text-gray-500">
            {{ t('savings_form_deposit_date_helper') }}
          </p>
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
          {{ isSaving ? t('saving') : (isEditing ? t('savings_form_update') : t('savings_form_submit')) }}
        </button>
      </div>
    </template>
  </FormModal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useTranslation } from '@/i18n'
import { type CurrencyCode } from '@/constants/currency'
import { type CapitalizationPeriodCode } from '@/constants/capitalizationPeriod'
import FormModal from '@/components/forms/FormModal.vue'
import TextInput from '@/components/forms/TextInput.vue'
import SelectInput from '@/components/forms/SelectInput.vue'
import CurrencyInput from '@/components/forms/CurrencyInput.vue'

// Get current date for max date validation
const maxDate = computed(() => {
  const today = new Date()
  return today.toISOString().split('T')[0]
})

// Get minimum date (1900-01-01)
const minDate = computed(() => {
  return '1900-01-01'
})

export interface SavingsFormData {
  name: string
  amount: number | null
  currency: CurrencyCode | null
  earningInterest: boolean
  interestRate: string
  capitalizationPeriod: CapitalizationPeriodCode | null
  depositDate: string | null
}

interface Props {
  modelValue: boolean
  formData: SavingsFormData
  canSubmit: boolean
  isSaving?: boolean
  isEditing?: boolean
  localeString: string
  currencyOptions: Array<{ label: string; value: CurrencyCode }>
  capitalizationPeriodOptions: Array<{ label: string; value: CapitalizationPeriodCode }>
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

