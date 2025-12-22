<template>
  <div class="p-6">
    <!-- Loading State -->
    <div v-if="isDataLoading" class="flex items-center justify-center min-h-[60vh]">
      <p>{{ t('loading') }}</p>
    </div>

    <!-- Expenses List (if expenses exist) -->
    <div v-else-if="expenses && expenses.length > 0" class="max-w-6xl mx-auto">
      <!-- Toolbar -->
      <div class="flex justify-end items-center gap-4 mb-2">
        <Button
          variant="primary"
          @click="showModal = true"
        >
          {{ t('expense_form_submit') }}
        </Button>
      </div>

      <DataTable
        :columns="tableColumns"
        :data="expenses"
        currency-column-key="base_currency"
        :show-currency-dropdown="true"
        :currency-options="currencyOptions"
        v-model:display-base-currency="displayBaseCurrency"
      >
        <template #cell-limit="{ row }">
          {{ formatCurrency(row.amount, row.currency) }}
        </template>
        <template #cell-base_currency="{ row }">
          {{ formatBaseCurrency(row) }}
        </template>
        <template #cell-frequency="{ row }">
          {{ formatFrequency(row.frequency) }}
        </template>
        <template #cell-actions="{ row }">
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="p-1 hover:bg-gray-100 rounded transition"
              :aria-label="t('expense_table_edit')"
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
              :aria-label="t('expense_table_delete')"
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
      :emojis="['🐭', '💸']"
      :title="t('expense_empty_title')"
      :subtitle="t('expense_empty_subtitle')"
      :options="expenseOptionsForEmptyState"
      @option-click="(option) => handleOptionClick(option as unknown as ExpenseCategory)"
    />

    <!-- Add Expense Modal -->
    <ExpenseFormModal
      v-model="showModal"
      :form-data="formData"
      :is-saving="isSaving"
      :can-submit="canSubmit"
      :is-editing="!!editingExpenseId"
      :locale-string="localeString"
      :currency-options="currencyOptions"
      :frequency-options="frequencyOptions"
      @close="handleCloseModal"
      @submit="handleSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useTranslation } from '@/i18n'
import { getExpenseCategories, type ExpenseCategory } from '@/constants/financialCategories'
import { currencyOptions, type CurrencyCode } from '@/constants/currency'
import { getFrequencyOptions, getFrequencyLabel, type FrequencyCode } from '@/constants/frequency'
import { useCurrentScenario } from '@/composables/useCurrentScenario'
import { useExpenses, type Expense } from '@/composables/useExpenses'
import { useExpenseForm } from '@/composables/useExpenseForm'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { supabase } from '@/composables/useSupabase'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { queryKeys } from '@/lib/queryKeys'
import i18next from 'i18next'
import EmptyState from '@/components/EmptyState.vue'
import Button from '@/components/Button.vue'
import DataTable, { type TableColumn } from '@/components/DataTable.vue'
import ExpenseFormModal from '@/components/expenses/ExpenseFormModal.vue'

const { t } = useTranslation()
const { scenario, isLoading: isLoadingScenario } = useCurrentScenario()
const queryClient = useQueryClient()
const { userId } = useCurrentUser()

// Use expenses composable - передаем computed для реактивности
const scenarioId = computed(() => {
  const id = scenario.value?.id
  return id
})
const { expenses, isLoading: isLoadingExpenses, isFetching: isFetchingExpenses, convertedAmounts, isLoadingConverted, isFetchingConverted } = useExpenses(scenarioId)

const isDataLoading = computed(() => {
  const result = (() => {
    if (isLoadingScenario.value) return true
    if (scenario.value && expenses.value === undefined) return true
    if (isLoadingExpenses.value || isFetchingExpenses.value) return true
    
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

// Use expense form composable
const {
  formData,
  isSaving,
  showModal,
  canSubmit,
  editingExpenseId,
  handleOptionClick,
  handleCloseModal,
  handleSubmit,
  startEdit,
} = useExpenseForm(scenarioId, scenario, frequencyOptions)

// Table columns configuration
const tableColumns = computed<TableColumn[]>(() => [
  {
    key: 'type',
    label: t('expense_table_column_category'),
  },
  {
    key: 'limit',
    label: t('expense_table_column_limit'),
  },
  {
    key: 'base_currency',
    label: t('expense_table_column_base_currency'),
  },
  {
    key: 'frequency',
    label: t('expense_table_column_frequency'),
  },
  {
    key: 'actions',
    label: t('expense_table_column_actions'),
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
const formatBaseCurrency = (expense: Expense) => {
  const targetCurrency = displayBaseCurrency.value
  if (!targetCurrency) {
    return '—'
  }
  
  // If expense currency matches target currency, show the same amount
  if (expense.currency === targetCurrency) {
    return formatCurrency(expense.amount, targetCurrency)
  }
  
  // Use converted amount from bulk conversion
  const convertedAmount = convertedAmounts.value?.[expense.id]
  if (convertedAmount !== undefined && convertedAmount !== null) {
    return formatCurrency(convertedAmount, targetCurrency)
  }
  
  // If conversion is still loading, show loading indicator or original amount
  if (isLoadingConverted.value || isFetchingConverted.value) {
    // Show original amount while conversion is loading
    return formatCurrency(expense.amount, expense.currency)
  }
  
  // If conversion not available yet, show dash
  return '—'
}

// Handle edit expense
const handleEdit = (expense: Expense) => {
  startEdit(expense)
}

// Mutation for deleting expenses
const deleteExpenseMutation = useMutation({
  mutationFn: async (expenseId: string) => {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId)

    if (error) {
      throw error
    }
    return expenseId
  },
  onMutate: async (expenseId) => {
    const currentUserId = userId.value
    const currentScenarioId = scenario.value?.id
    if (!currentUserId || !currentScenarioId) return

    const queryKey = queryKeys.expenses.list(currentUserId, currentScenarioId)
    
    // Cancel any outgoing refetches
    await queryClient.cancelQueries({ queryKey })

    // Snapshot the previous value
    const previousExpenses = queryClient.getQueryData<Expense[]>(queryKey)

    // Optimistically remove the expense
    queryClient.setQueryData<Expense[]>(queryKey, (old) => {
      if (!old) return old
      return old.filter((expense) => expense.id !== expenseId)
    })

    return { previousExpenses }
  },
  onError: (error, _expenseId, context) => {
    const currentUserId = userId.value
    const currentScenarioId = scenario.value?.id
    if (!currentUserId || !currentScenarioId || !context?.previousExpenses) return

    // Rollback to previous value on error
    const queryKey = queryKeys.expenses.list(currentUserId, currentScenarioId)
    queryClient.setQueryData(queryKey, context.previousExpenses)
    
    console.error('Failed to delete expense:', error)
  },
  onSuccess: () => {
    // Don't manually update cache with unencrypted data from 'expenses' table
    // Instead, invalidate queries to trigger refetch from 'expenses_decrypted' view
    // This ensures we get properly decrypted data with amount field populated
    queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all })
    queryClient.invalidateQueries({ queryKey: queryKeys.summary.all })
  },
})

// Handle delete expense
const handleDelete = async (expense: Expense) => {
  const confirmMessage = t('expense_delete_confirm', { type: expense.type })
  const confirmed = window.confirm(confirmMessage)
  
  if (!confirmed) {
    return
  }

  deleteExpenseMutation.mutate(expense.id)
}
</script>