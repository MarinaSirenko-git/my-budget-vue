<template>
  <div class="p-6">
    <!-- Loading State -->
    <div v-if="isDataLoading" class="flex items-center justify-center min-h-[60vh]">
      <p>{{ t('loading') }}</p>
    </div>

    <!-- Incomes List (if incomes exist) -->
    <div v-else-if="incomes && incomes.length > 0" class="max-w-6xl mx-auto">
      <!-- Toolbar -->
      <div class="flex justify-end items-center gap-4 mb-2">
        <Button
          variant="primary"
          @click="showModal = true"
        >
          {{ t('income_form_submit') }}
        </Button>
      </div>

      <DataTable
        :columns="tableColumns"
        :data="incomes"
        currency-column-key="base_currency"
        :show-currency-dropdown="true"
        :currency-options="currencyOptions"
        v-model:display-base-currency="displayBaseCurrency"
      >
        <template #cell-expected_amount="{ row }">
          {{ formatCurrency(row.amount, row.currency) }}
        </template>
        <template #cell-base_currency="{ row }">
          {{ formatBaseCurrency(row.amount, row.currency) }}
        </template>
        <template #cell-frequency="{ row }">
          {{ formatFrequency(row.frequency) }}
        </template>
        <template #cell-actions="{ row }">
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="p-1 hover:bg-gray-100 rounded transition"
              :aria-label="t('income_table_edit')"
              @click="handleEdit(row)"
            >
              <svg
                class="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            <button
              type="button"
              class="p-1 hover:bg-gray-100 rounded transition"
              :aria-label="t('income_table_delete')"
              @click="handleDelete(row)"
            >
              <svg
                class="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </div>
        </template>
      </DataTable>
    </div>

    <!-- Empty State (only when loading is complete and no data) -->
    <EmptyState
      v-else
      :emojis="['🐭', '💵']"
      :title="t('income_empty_title')"
      :subtitle="t('income_empty_subtitle')"
      :options="incomeOptionsForEmptyState"
      @option-click="(option) => handleOptionClick(option as unknown as IncomeType)"
    />

    <!-- Add Income Modal -->
    <IncomeFormModal
      v-model="showModal"
      :form-data="formData"
      :is-saving="isSaving"
      :can-submit="canSubmit"
      :is-editing="!!editingIncomeId"
      :locale-string="localeString"
      :currency-options="currencyOptions"
      :frequency-options="frequencyOptions"
      :day-options="dayOptions"
      @close="handleCloseModal"
      @submit="handleSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useTranslation } from '@/i18n'
import { getIncomeCategories, type IncomeType } from '@/constants/financialCategories'
import { currencyOptions, type CurrencyCode } from '@/constants/currency'
import { getFrequencyOptions, getFrequencyLabel, type FrequencyCode } from '@/constants/frequency'
import { useCurrentScenario } from '@/composables/useCurrentScenario'
import { useIncomes, type Income } from '@/composables/useIncomes'
import { useIncomeForm } from '@/composables/useIncomeForm'
import { useQueryClient } from '@tanstack/vue-query'
import { supabase } from '@/composables/useSupabase'
import i18next from 'i18next'
import EmptyState from '@/components/EmptyState.vue'
import IncomeFormModal from '@/components/incomes/IncomeFormModal.vue'
import Button from '@/components/Button.vue'
import DataTable, { type TableColumn } from '@/components/DataTable.vue'

const { t } = useTranslation()
const { scenario, isLoading: isLoadingScenario } = useCurrentScenario()
const queryClient = useQueryClient()

// Use incomes composable - передаем computed для реактивности
const scenarioId = computed(() => {
  const id = scenario.value?.id
  return id
})
const { incomes, isLoading: isLoadingIncomes, isFetching: isFetchingIncomes } = useIncomes(scenarioId)

const isDataLoading = computed(() => {
  const result = (() => {

    if (isLoadingScenario.value) return true
    if (scenario.value && incomes.value === undefined) return true
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

// Transform income options for EmptyState component
const incomeOptionsForEmptyState = computed(() => {
  return incomeOptions.value.map(option => ({
    ...option, // Include all properties including id and label
  }))
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

// Use income form composable
const {
  formData,
  isSaving,
  showModal,
  canSubmit,
  editingIncomeId,
  handleOptionClick,
  handleCloseModal,
  handleSubmit,
  startEdit,
} = useIncomeForm(scenarioId, scenario, frequencyOptions)

// Table columns configuration
const tableColumns = computed<TableColumn[]>(() => [
  {
    key: 'type',
    label: t('income_table_column_category'),
  },
  {
    key: 'expected_amount',
    label: t('income_table_column_expected_amount'),
  },
  {
    key: 'base_currency',
    label: t('income_table_column_base_currency'),
  },
  {
    key: 'frequency',
    label: t('income_table_column_frequency'),
  },
  {
    key: 'payment_day',
    label: t('income_table_column_payment_day'),
  },
  {
    key: 'actions',
    label: t('income_table_column_actions'),
  },
])

// Display base currency state
const displayBaseCurrency = ref<CurrencyCode | null>(null)

// Initialize display base currency from scenario
watch(() => scenario.value?.base_currency, (newCurrency) => {
  if (newCurrency && !displayBaseCurrency.value) {
    displayBaseCurrency.value = newCurrency as CurrencyCode
  }
}, { immediate: true })

// Format currency using Intl.NumberFormat
const formatCurrency = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat(localeString.value, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch (error) {
    // Fallback if currency or locale is invalid
    return `${amount.toFixed(2)} ${currency}`
  }
}

// Format frequency label
const formatFrequency = (frequency: string) => {
  return getFrequencyLabel(frequency as FrequencyCode, currentLocale.value)
}

// Format amount in base currency
const formatBaseCurrency = (amount: number, incomeCurrency: string) => {
  const targetCurrency = displayBaseCurrency.value
  if (!targetCurrency) {
    return '—'
  }
  
  // If income currency matches target currency, show the same amount
  if (incomeCurrency === targetCurrency) {
    return formatCurrency(amount, targetCurrency)
  }
  
  // TODO: Implement currency conversion when API is available
  // For now, show dash if currencies don't match
  return '—'
}

// Handle edit income
const handleEdit = (income: Income) => {
  startEdit(income)
}

// Handle delete income
const handleDelete = async (income: Income) => {
  const confirmMessage = t('income_delete_confirm', { type: income.type })
  const confirmed = window.confirm(confirmMessage)
  
  if (!confirmed) {
    return
  }

  try {
    const { error } = await supabase
      .from('incomes')
      .delete()
      .eq('id', income.id)

    if (error) {
      throw error
    }

    // Invalidate incomes query to refresh the list
    queryClient.invalidateQueries({ queryKey: ['incomes'] })
  } catch (error) {
    console.error('Failed to delete income:', error)
    // Show error message to user
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete income'
    window.alert(errorMessage)
  }
}
</script>


