<template>
  <div class="p-6">
    <!-- Empty State -->
    <EmptyState
      :emojis="['🐭', '💸']"
      :title="t('expense_empty_title')"
      :subtitle="t('expense_empty_subtitle')"
      :options="expenseOptionsForEmptyState"
      @option-click="(option) => handleOptionClick(option as unknown as ExpenseCategory)"
    />

    <!-- Add Expense Modal -->
    <FormModal
      v-model="showModal"
      :title="t('expense_form_title')"
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
            :disabled="!canSubmit"
            @click="handleSubmit"
          >
            {{ t('expense_form_submit') }}
          </button>
        </div>
      </template>
    </FormModal>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useTranslation } from '@/i18n'
import { getExpenseCategories, type ExpenseCategory } from '@/constants/financialCategories'
import { currencyOptions, type CurrencyCode } from '@/constants/currency'
import { getFrequencyOptions, type FrequencyCode } from '@/constants/frequency'
import { useCurrentScenario } from '@/composables/useCurrentScenario'
import i18next from 'i18next'
import FormModal from '@/components/forms/FormModal.vue'
import TextInput from '@/components/forms/TextInput.vue'
import SelectInput from '@/components/forms/SelectInput.vue'
import CurrencyInput from '@/components/forms/CurrencyInput.vue'
import EmptyState from '@/components/EmptyState.vue'

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

// Get expense categories with labels
const expenseOptions = computed<ExpenseCategory[]>(() => {
  return getExpenseCategories(currentLocale.value)
})

// Transform expense options for EmptyState component
const expenseOptionsForEmptyState = computed(() => {
  return expenseOptions.value.map(option => ({
    ...option, // Include all properties including id and label
  }))
})

// Get frequency options
const frequencyOptions = computed(() => {
  return getFrequencyOptions(currentLocale.value)
})

// Modal state
const showModal = ref(false)
const selectedCategory = ref<ExpenseCategory | null>(null)

// Form data
const formData = ref({
  categoryName: '',
  amount: null as number | null,
  currency: null as CurrencyCode | null,
  frequency: null as FrequencyCode | null,
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
    formData.value.frequency !== null
  )
})

const handleOptionClick = (option: ExpenseCategory) => {
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

  // TODO: Implement saving expense when functionality is ready
  console.log('Submitting expense:', {
    category: selectedCategory.value,
    ...formData.value,
  })

  handleCloseModal()
}
</script>
