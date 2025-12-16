<template>
  <div class="p-6">
    <!-- Empty State -->
    <div class="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8">
      <!-- Emojis -->
      <div class="text-6xl flex items-center justify-center gap-4">
        <span>🐭</span>
        <span>💵</span>
      </div>

      <!-- Title and Subtitle -->
      <div class="space-y-3 max-w-md">
        <h1 class="text-2xl font-bold text-gray-900">
          {{ t('income_empty_title') }}
        </h1>
        <p class="text-md text-gray-600">
          {{ t('income_empty_subtitle') }}
        </p>
      </div>

      <!-- Income Options Tags -->
      <div class="grid grid-cols-3 gap-3 max-w-2xl">
        <button
          v-for="option in incomeOptions"
          :key="option.id"
          class="w-full px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900 transition-colors text-sm font-medium"
          @click="handleOptionClick(option)"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <!-- Add Income Modal -->
    <FormModal
      v-model="showModal"
      :title="t('income_form_title')"
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
            :disabled="!canSubmit"
            @click="handleSubmit"
          >
            {{ t('income_form_submit') }}
          </button>
        </div>
      </template>
    </FormModal>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useTranslation } from '@/i18n'
import { getIncomeCategories, type IncomeType } from '@/constants/financialCategories'
import { currencyOptions, type CurrencyCode } from '@/constants/currency'
import { getFrequencyOptions, type FrequencyCode } from '@/constants/frequency'
import { useCurrentScenario } from '@/composables/useCurrentScenario'
import i18next from 'i18next'
import FormModal from '@/components/forms/FormModal.vue'
import TextInput from '@/components/forms/TextInput.vue'
import SelectInput from '@/components/forms/SelectInput.vue'
import CurrencyInput from '@/components/forms/CurrencyInput.vue'

const { t } = useTranslation()
const { scenario } = useCurrentScenario()

// Get current locale from i18next
const currentLocale = computed<'en' | 'ru'>(() => {
  const lang = i18next.language || i18next.languages?.[0] || 'en'
  return lang.startsWith('ru') ? 'ru' : 'en'
})

// Get locale string for currency input
const localeString = computed(() => {
  return currentLocale.value === 'ru' ? 'ru-RU' : 'en-US'
})

// Get income categories with labels
const incomeOptions = computed<IncomeType[]>(() => {
  return getIncomeCategories(currentLocale.value)
})

// Get frequency options
const frequencyOptions = computed(() => {
  return getFrequencyOptions(currentLocale.value)
})

// Get day options (1-31)
const dayOptions = computed(() => {
  return Array.from({ length: 31 }, (_, i) => {
    const day = i + 1
    return {
      label: day.toString(),
      value: day.toString(),
    }
  })
})

// Modal state
const showModal = ref(false)
const selectedCategory = ref<IncomeType | null>(null)

// Form data
const formData = ref({
  categoryName: '',
  amount: null as number | null,
  currency: null as CurrencyCode | null,
  frequency: null as FrequencyCode | null,
  paymentDay: null as string | null,
})

// Reset form when modal closes
watch(showModal, (isOpen) => {
  if (!isOpen) {
    selectedCategory.value = null
    formData.value = {
      categoryName: '',
      amount: null,
      currency: null,
      frequency: null,
      paymentDay: null,
    }
  } else {
    // Set default currency from scenario when modal opens, if not already set
    if (!formData.value.currency && scenario.value?.base_currency) {
      const scenarioCurrency = scenario.value.base_currency as CurrencyCode
      if (currencyOptions.some(opt => opt.value === scenarioCurrency)) {
        formData.value.currency = scenarioCurrency
      }
    }
  }
})

const canSubmit = computed(() => {
  return (
    formData.value.categoryName.trim() !== '' &&
    formData.value.amount !== null &&
    formData.value.amount > 0 &&
    formData.value.currency !== null &&
    formData.value.frequency !== null &&
    formData.value.paymentDay !== null
  )
})

const handleOptionClick = (option: IncomeType) => {
  selectedCategory.value = option
  // Set category name from selected option, but leave empty if it's custom
  if (option.isCustom) {
    formData.value.categoryName = ''
  } else {
    formData.value.categoryName = option.label
  }
  // Set default currency from scenario base_currency, or first option if available
  if (!formData.value.currency) {
    const scenarioCurrency = scenario.value?.base_currency as CurrencyCode | null | undefined
    if (scenarioCurrency && currencyOptions.some(opt => opt.value === scenarioCurrency)) {
      formData.value.currency = scenarioCurrency
    } else if (currencyOptions.length > 0) {
      formData.value.currency = currencyOptions[0].value
    }
  }
  // Set default frequency to monthly if available
  if (frequencyOptions.value.length > 0 && !formData.value.frequency) {
    formData.value.frequency = 'monthly'
  }
  showModal.value = true
}

const handleCloseModal = () => {
  showModal.value = false
}

const handleSubmit = () => {
  if (!canSubmit.value || !selectedCategory.value) return

  // TODO: Implement saving income when functionality is ready
  console.log('Submitting income:', {
    category: selectedCategory.value,
    ...formData.value,
  })

  handleCloseModal()
}
</script>


