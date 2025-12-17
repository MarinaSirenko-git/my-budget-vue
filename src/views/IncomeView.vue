<template>
  <div class="p-6">
    <!-- Loading State -->
    <div v-if="isDataLoading" class="flex items-center justify-center min-h-[60vh]">
      <p>{{ t('loading') }}</p>
    </div>

    <!-- Incomes List (if incomes exist) -->
    <div v-else-if="incomes && incomes.length > 0" class="space-y-4 max-w-4xl mx-auto">
      <h2 class="text-2xl font-bold text-gray-900 mb-4">Your Incomes</h2>
      <div
        v-for="income in incomes"
        :key="income.id"
        class="p-4 bg-gray-50 rounded-lg border border-gray-200"
      >
        <div class="flex justify-between items-start">
          <div>
            <h3 class="font-semibold text-gray-900">{{ income.type }}</h3>
            <p class="text-sm text-gray-600 mt-1">
              {{ income.amount }} {{ income.currency }} • {{ income.frequency }} • Day {{ income.payment_day }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State (only when loading is complete and no data) -->
    <div v-else class="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8">
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
            :disabled="!canSubmit || isSaving"
            @click="handleSubmit"
          >
            {{ isSaving ? t('saving') : t('income_form_submit') }}
          </button>
        </div>
      </template>
    </FormModal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch, watchEffect } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import { useTranslation } from '@/i18n'
import { getIncomeCategories, type IncomeType } from '@/constants/financialCategories'
import { currencyOptions, type CurrencyCode } from '@/constants/currency'
import { getFrequencyOptions, type FrequencyCode } from '@/constants/frequency'
import { useCurrentScenario } from '@/composables/useCurrentScenario'
import { useIncomes } from '@/composables/useIncomes'
import { supabase } from '@/composables/useSupabase'
import i18next from 'i18next'
import FormModal from '@/components/forms/FormModal.vue'
import TextInput from '@/components/forms/TextInput.vue'
import SelectInput from '@/components/forms/SelectInput.vue'
import CurrencyInput from '@/components/forms/CurrencyInput.vue'

const { t } = useTranslation()
const { scenario, isLoading: isLoadingScenario } = useCurrentScenario()
const queryClient = useQueryClient()

// Use incomes composable - передаем computed для реактивности
const scenarioId = computed(() => {
  const id = scenario.value?.id
  return id
})
const { incomes, isLoading: isLoadingIncomes, isFetching: isFetchingIncomes } = useIncomes(scenarioId)

// Показываем загрузку если:
// 1. Загружается scenario (без него не можем загрузить incomes)
// 2. Идет запрос incomes (isLoading или isFetching)
// 3. Scenario загружен, но incomes еще undefined (данные еще не загружены)
const isDataLoading = computed(() => {
  const result = (() => {
    // Если scenario загружается, всегда показываем загрузку
    if (isLoadingScenario.value) return true
    
    // Если scenario загружен, но incomes еще undefined - показываем загрузку
    if (scenario.value && incomes.value === undefined) return true
    
    // Если идет запрос, показываем загрузку
    if (isLoadingIncomes.value || isFetchingIncomes.value) return true
    
    return false
  })()
  
  return result
})

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
const isSaving = ref(false)
const saveError = ref<string | null>(null)

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

const handleSubmit = async () => {
  if (!canSubmit.value || !selectedCategory.value || !scenario.value) return

  isSaving.value = true
  saveError.value = null

  try {
    const { error } = await supabase
      .from('incomes')
      .insert({
        amount: formData.value.amount,
        currency: formData.value.currency,
        type: formData.value.categoryName.trim(),
        frequency: formData.value.frequency || 'monthly',
        payment_day: formData.value.paymentDay,
        scenario_id: scenario.value.id,
      })

    if (error) {
      throw error
    }

    // Invalidate incomes query to refresh the list
    queryClient.invalidateQueries({ queryKey: ['incomes'] })

    handleCloseModal()
  } catch (error) {
    console.error('Failed to save income:', error)
    saveError.value = error instanceof Error ? error.message : 'Failed to save income'
    // TODO: Show error message to user (e.g., using a toast notification)
  } finally {
    isSaving.value = false
  }
}
</script>


