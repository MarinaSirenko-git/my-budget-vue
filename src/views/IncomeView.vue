<template>
  <div class="p-4 sm:p-6">
    <!-- Loading State -->
    <div v-if="isDataLoading" class="flex items-center justify-center min-h-[60vh]">
      <p>{{ t('loading') }}</p>
    </div>

    <!-- Incomes List (if incomes exist) -->
    <div v-else-if="incomes && incomes.length > 0" class="max-w-6xl mx-auto">
      <!-- Toolbar -->
      <div class="flex justify-end items-center gap-4 mb-4 sm:mb-2">
        <Button
          variant="primary"
          class="w-full sm:w-auto"
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
        @currency-change="handleCurrencyChange"
      >
        <template #cell-expected_amount="{ row }">
          {{ formatCurrency(row.amount, row.currency) }}
        </template>
        <template #cell-base_currency="{ row }">
          {{ formatBaseCurrency(row) }}
        </template>
        <template #cell-frequency="{ row }">
          {{ formatFrequency(row.frequency) }}
        </template>
        <template #cell-actions="{ row }">
          <div class="flex items-center gap-2 md:gap-1">
            <button
              type="button"
              class="p-2 md:p-1 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 hover:bg-gray-100 rounded transition flex items-center justify-center"
              :aria-label="t('income_table_edit')"
              @click="handleEdit(row)"
            >
              <svg
                class="w-5 h-5 md:w-4 md:h-4"
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
              class="p-2 md:p-1 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 hover:bg-gray-100 rounded transition flex items-center justify-center"
              :aria-label="t('income_table_delete')"
              @click="handleDelete(row)"
            >
              <svg
                class="w-5 h-5 md:w-4 md:h-4"
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
import { useHeadMeta } from '@/composables/useHeadMeta'
import { computed, ref, watch } from 'vue'
import { useTranslation } from '@/i18n'
import { getIncomeCategories, type IncomeType } from '@/constants/financialCategories'
import { currencyOptions, type CurrencyCode } from '@/constants/currency'
import { getFrequencyOptions, getFrequencyLabel, type FrequencyCode } from '@/constants/frequency'
import { useCurrentScenario } from '@/composables/useCurrentScenario'
import { useIncomes, type Income } from '@/composables/useIncomes'
import { useIncomeForm } from '@/composables/useIncomeForm'
import { useDisplayCurrencyConversion } from '@/composables/useDisplayCurrencyConversion'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { supabase } from '@/composables/useSupabase'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { queryKeys } from '@/lib/queryKeys'
import i18next from 'i18next'
import EmptyState from '@/components/EmptyState.vue'
import IncomeFormModal from '@/components/incomes/IncomeFormModal.vue'
import Button from '@/components/Button.vue'
import DataTable, { type TableColumn } from '@/components/DataTable.vue'

const { t } = useTranslation()

// Set page metadata
useHeadMeta({
  title: () => t('page_title_income'),
  description: () => t('page_description_income')
})

// Vue cache client

// data control methods:

// .getQueryData() - get data from cache
// .getQueriesData() - get data from cache by query key
// .setQueryData() - set data to cache
// .setQueriesData() - set data to cache by query key
// .setQueryState() - get state of request by query key

// process control methods:

// .fetchQuery() - fetch data from server
// .prefetchQuery() - prefetch data from server
// .fetchInfiniteQuery() - fetch infinite data from server
// .prefetchInfiniteQuery() - prefetch infinite data from server
// .ensureQueryData() - ensure data in cache
// .ensureInfiniteQueryData() - ensure infinite data in cache

// data state control methods:

// .invalidateQueries() - invalidate cache
// .refetchQueries() - refetch data no matter if it's in cache or not
// .cancelQueries() - cancel request by query key
// .removeQueries() - remove queries from cache by query key
// .resetQueries() - reset queries by query key

// mutation control methods:

// getMutationCache() — get mutation cache
// getMutationState(mutationKey) — get mutation state
// setMutationDefaults(mutationKey, options) — set mutation defaults
// resetMutationDefaults(mutationKey) — reset mutation defaults

// common control methods:

// clear() — clear all queries and mutations from cache
// getQueryCache() — get query cache
// getDefaultOptions() — get default options
// setDefaultOptions(options) — set default options
// getLogger() — get logger
// setLogger(logger) — set logger

const queryClient = useQueryClient()

const { scenario, isLoading: isLoadingScenario } = useCurrentScenario()
const { userId } = useCurrentUser()

const scenarioId = computed(() => {
  return scenario.value?.id
})

// Use incomes composable
const { incomes, isLoading: isLoadingIncomes, isFetching: isFetchingIncomes } = useIncomes(scenarioId)

//
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

// Use display currency conversion composable
const {
  convertedAmounts: displayConvertedAmounts,
  isLoading: isLoadingDisplayConverted,
  isFetching: isFetchingDisplayConverted,
} = useDisplayCurrencyConversion(incomes, displayBaseCurrency, 'incomes')

// Handle currency change event from DataTable
const handleCurrencyChange = (_currency: CurrencyCode) => {
  // The conversion will automatically trigger via reactivity of displayBaseCurrency
  // which is already updated by v-model:display-base-currency
  // This handler can be used for additional logic if needed in the future
}

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

// // Format amount in base currency
// const formatBaseCurrency = (income: Income) => {
//   const targetCurrency = displayBaseCurrency.value
//   if (!targetCurrency) {
//     return '—'
//   }
  
//   // If income currency matches target currency, show the same amount
//   if (income.currency === targetCurrency) {
//     return formatCurrency(income.amount, targetCurrency)
//   }
  
//   // Use converted amount from bulk conversion
//   const convertedAmount = convertedAmounts.value?.[income.id]
//   if (convertedAmount !== undefined && convertedAmount !== null) {
//     return formatCurrency(convertedAmount, targetCurrency)
//   }
  
//   // If conversion is still loading, show loading indicator or original amount
//   if (isLoadingConverted.value || isFetchingConverted.value) {
//     // Show original amount while conversion is loading
//     return formatCurrency(income.amount, income.currency)
//   }
  
//   // If conversion not available yet, show dash
//   return '—'
// }

// Format amount in base currency (using display currency for table display)
const formatBaseCurrency = (income: Income) => {
  const targetCurrency = displayBaseCurrency.value
  if (!targetCurrency) {
    return '—'
  }
  
  // If income currency matches target currency, show the same amount
  if (income.currency === targetCurrency) {
    return formatCurrency(income.amount, targetCurrency)
  }
  
  // Use converted amount from display conversion (for selected display currency)
  const convertedAmount = displayConvertedAmounts.value?.[income.id]
  if (convertedAmount !== undefined && convertedAmount !== null) {
    return formatCurrency(convertedAmount, targetCurrency)
  }
  
  // If conversion is still loading, show loading indicator or original amount
  if (isLoadingDisplayConverted.value || isFetchingDisplayConverted.value) {
    // Show original amount while conversion is loading
    return formatCurrency(income.amount, income.currency)
  }
  
  // If conversion not available yet, show dash
  return '—'
}

// Handle edit income
const handleEdit = (income: Income) => {
  startEdit(income)
}

// Mutation for deleting incomes
const deleteIncomeMutation = useMutation({
  mutationFn: async (incomeId: string) => {
    const { error } = await supabase
      .from('incomes')
      .delete()
      .eq('id', incomeId)

    if (error) {
      throw error
    }
    return incomeId
  },
  onMutate: async (incomeId) => {
    const currentUserId = userId.value
    const currentScenarioId = scenario.value?.id
    if (!currentUserId || !currentScenarioId) return

    const queryKey = queryKeys.incomes.list(currentUserId, currentScenarioId)
    
    // Cancel any outgoing refetches
    await queryClient.cancelQueries({ queryKey })

    // Snapshot the previous value
    const previousIncomes = queryClient.getQueryData<Income[]>(queryKey)

    // Optimistically remove the income
    queryClient.setQueryData<Income[]>(queryKey, (old) => {
      if (!old) return old
      return old.filter((income) => income.id !== incomeId)
    })

    return { previousIncomes }
  },
  onError: (error, _incomeId, context) => {
    const currentUserId = userId.value
    const currentScenarioId = scenario.value?.id
    if (!currentUserId || !currentScenarioId || !context?.previousIncomes) return

    // Rollback to previous value on error
    const queryKey = queryKeys.incomes.list(currentUserId, currentScenarioId)
    queryClient.setQueryData(queryKey, context.previousIncomes)
    
    console.error('Failed to delete income:', error)
  },
  onSuccess: () => {
    // Don't manually update cache with unencrypted data from 'incomes' table
    // Instead, invalidate queries to trigger refetch from 'incomes_decrypted' view
    // This ensures we get properly decrypted data with amount field populated
    queryClient.invalidateQueries({ queryKey: queryKeys.incomes.all })
    queryClient.invalidateQueries({ queryKey: queryKeys.summary.all })
  },
})

// Handle delete income
const handleDelete = async (income: Income) => {
  const confirmMessage = t('income_delete_confirm', { type: income.type })
  const confirmed = window.confirm(confirmMessage)
  
  if (!confirmed) {
    return
  }

  deleteIncomeMutation.mutate(income.id)
}
</script>


