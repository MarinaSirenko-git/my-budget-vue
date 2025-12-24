<template>
  <div class="p-6">
    <!-- Loading State -->
    <div v-if="isDataLoading" class="flex items-center justify-center min-h-[60vh]">
      <p>{{ t('loading') }}</p>
    </div>

    <!-- Savings List (if savings exist) -->
    <div v-else-if="savings && savings.length > 0" class="max-w-6xl mx-auto">
      <!-- Toolbar -->
      <div class="flex justify-end items-center gap-4 mb-2">
        <Button
          variant="primary"
          @click="handleAddSavings"
        >
          {{ t('savings_form_submit') }}
        </Button>
      </div>

      <DataTable
        :columns="tableColumns"
        :data="savings"
        currency-column-key="base_currency"
        :show-currency-dropdown="true"
        :currency-options="currencyOptions"
        v-model:display-base-currency="displayBaseCurrency"
        @currency-change="handleCurrencyChange"
      >
        <template #cell-amount="{ row }">
          {{ formatCurrency(row.amount, row.currency) }}
        </template>
        <template #cell-interest_earned="{ row }">
          {{ formatInterestEarned(row) }}
        </template>
        <template #cell-base_currency="{ row }">
          {{ formatBaseCurrency(row) }}
        </template>
        <template #cell-interest_rate="{ row }">
          {{ formatInterestRate(row) }}
        </template>
        <template #cell-capitalization_period="{ row }">
          {{ formatCapitalizationPeriod(row.capitalization_period) }}
        </template>

        <template #cell-actions="{ row }">
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="p-1 hover:bg-gray-100 rounded transition"
              :aria-label="t('savings_table_edit')"
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
              :aria-label="t('savings_table_delete')"
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
      :emojis="['🐭', '💰']"
      :title="t('savings_empty_title')"
      :subtitle="t('savings_empty_subtitle')"
      :action-button="{ label: t('savings_empty_add_first'), onClick: handleAddSavings }"
    />

    <!-- Add Savings Modal -->
    <SavingsFormModal
      v-model="showModal"
      :form-data="formData"
      :can-submit="canSubmit"
      :is-saving="isSaving"
      :is-editing="!!editingSavingsId"
      :locale-string="localeString"
      :currency-options="currencyOptions"
      :capitalization-period-options="capitalizationPeriodOptions"
      @close="handleCloseModal"
      @submit="handleSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useTranslation } from '@/i18n'
import { currencyOptions, type CurrencyCode } from '@/constants/currency'
import { getCapitalizationPeriodOptions, getCapitalizationPeriodLabel, type CapitalizationPeriodCode } from '@/constants/capitalizationPeriod'
import { useCurrentScenario } from '@/composables/useCurrentScenario'
import { useSavings, type Savings } from '@/composables/useSavings'
import { useSavingsForm } from '@/composables/useSavingsForm'
import { useDisplayCurrencyConversion } from '@/composables/useDisplayCurrencyConversion'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { supabase } from '@/composables/useSupabase'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { queryKeys } from '@/lib/queryKeys'
import { calculateInterestSinceDate } from '@/utils/compoundInterest'
import i18next from 'i18next'
import EmptyState from '@/components/EmptyState.vue'
import SavingsFormModal from '@/components/savings/SavingsFormModal.vue'
import Button from '@/components/Button.vue'
import DataTable, { type TableColumn } from '@/components/DataTable.vue'

const { t } = useTranslation()
const { scenario, isLoading: isLoadingScenario } = useCurrentScenario()
const queryClient = useQueryClient()
const { userId } = useCurrentUser()

// Get scenario ID from scenario
const scenarioId = computed(() => scenario.value?.id ?? null)

// Use savings composable
const { savings, isLoading: isLoadingSavings, isFetching: isFetchingSavings } = useSavings(scenarioId)

const isDataLoading = computed(() => {
  const result = (() => {
    if (isLoadingScenario.value) return true
    if (scenario.value && savings.value === undefined) return true
    if (isLoadingSavings.value || isFetchingSavings.value) return true
    
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

// Get capitalization period options
const capitalizationPeriodOptions = computed(() => {
  return getCapitalizationPeriodOptions(currentLocale.value)
})

// Use savings form composable
const {
  formData,
  showModal,
  canSubmit,
  isSaving,
  handleCloseModal,
  handleSubmit,
  startEdit,
  editingSavingsId,
} = useSavingsForm(scenarioId, scenario)

// Check if any savings have interest rate
const hasInterestRate = computed(() => {
  return savings.value?.some(saving => saving.interest_rate !== null && saving.interest_rate !== undefined) ?? false
})

// Check if any savings have capitalization period
const hasCapitalizationPeriod = computed(() => {
  return savings.value?.some(saving => saving.capitalization_period !== null && saving.capitalization_period !== undefined) ?? false
})

// Check if any savings have interest earned (have all required fields for calculation)
const hasInterestEarned = computed(() => {
  return savings.value?.some(saving => 
    saving.interest_rate !== null && 
    saving.interest_rate !== undefined &&
    saving.capitalization_period !== null &&
    saving.capitalization_period !== undefined &&
    (saving.deposit_date !== null || saving.created_at !== null)
  ) ?? false
})

// Table columns configuration
const tableColumns = computed<TableColumn[]>(() => {
  const columns: TableColumn[] = [
    {
      key: 'comment',
      label: t('savings_table_column_name'),
    },
    {
      key: 'amount',
      label: t('savings_table_column_amount'),
    },
  ]

  // Add interest earned column only if at least one saving has all required fields
  // Place it right after "Amount"
  if (hasInterestEarned.value) {
    columns.push({
      key: 'interest_earned',
      label: t('savings_table_column_interest_earned'),
    })
  }

  columns.push({
    key: 'base_currency',
    label: t('savings_table_column_base_currency'),
  })

  // Add interest rate column only if at least one saving has it
  if (hasInterestRate.value) {
    columns.push({
      key: 'interest_rate',
      label: t('savings_table_column_interest_rate'),
    })
  }

  // Add capitalization period column only if at least one saving has it
  if (hasCapitalizationPeriod.value) {
    columns.push({
      key: 'capitalization_period',
      label: t('savings_table_column_capitalization_period'),
    })
  }

  // Always add actions column at the end
  columns.push({
    key: 'actions',
    label: t('savings_table_column_actions'),
  })

  return columns
})

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
} = useDisplayCurrencyConversion(savings, displayBaseCurrency, 'savings')

// Handle currency change event from DataTable
const handleCurrencyChange = () => {
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

// Format amount in base currency (using display currency for table display)
// Shows total amount: principal + interest earned
const formatBaseCurrency = (saving: Savings) => {
  const targetCurrency = displayBaseCurrency.value
  if (!targetCurrency) {
    return '—'
  }
  
  // Calculate total amount (principal + interest)
  let totalAmount = saving.amount
  
  // Add interest if available
  if (saving.interest_rate && saving.capitalization_period) {
    const startDate = saving.deposit_date || saving.created_at
    if (startDate) {
      try {
        const interest = calculateInterestSinceDate(
          saving.amount,
          saving.interest_rate,
          saving.capitalization_period as CapitalizationPeriodCode,
          startDate
        )
        totalAmount = saving.amount + interest
      } catch (error) {
        console.error('Error calculating interest for base currency:', error)
        // Continue with just principal if calculation fails
      }
    }
  }
  
  // If saving currency matches target currency, show the total amount
  if (saving.currency === targetCurrency) {
    return formatCurrency(totalAmount, targetCurrency)
  }
  
  // For currency conversion, we need to convert the total amount
  // Use the conversion rate from the principal amount conversion
  const convertedPrincipal = displayConvertedAmounts.value?.[saving.id]
  if (convertedPrincipal !== undefined && convertedPrincipal !== null) {
    // Calculate conversion rate
    const conversionRate = convertedPrincipal / saving.amount
    // Apply same rate to total amount
    const convertedTotal = totalAmount * conversionRate
    return formatCurrency(convertedTotal, targetCurrency)
  }
  
  // If conversion is still loading, show loading indicator or original amount
  if (isLoadingDisplayConverted.value || isFetchingDisplayConverted.value) {
    // Show original total amount while conversion is loading
    return formatCurrency(totalAmount, saving.currency)
  }
  
  // If conversion not available yet, show dash
  return '—'
}

// Format interest rate
const formatInterestRate = (saving: Savings) => {
  if (saving.interest_rate === null || saving.interest_rate === undefined) {
    return '—'
  }
  return `${saving.interest_rate.toFixed(2)}%`
}

// Format capitalization period
const formatCapitalizationPeriod = (period: string | null) => {
  if (!period) return '—'
  return getCapitalizationPeriodLabel(period as CapitalizationPeriodCode, currentLocale.value)
}

// Format interest earned
const formatInterestEarned = (saving: Savings) => {
  if (!saving.interest_rate || !saving.capitalization_period) {
    return '—'
  }

  // Use deposit_date if available, otherwise use created_at as fallback
  const startDate = saving.deposit_date || saving.created_at
  if (!startDate) {
    return '—'
  }

  try {
    const interest = calculateInterestSinceDate(
      saving.amount,
      saving.interest_rate,
      saving.capitalization_period as CapitalizationPeriodCode,
      startDate
    )

    if (interest === 0) {
      return '—'
    }

    return formatCurrency(interest, saving.currency)
  } catch (error) {
    console.error('Error calculating interest:', error)
    return '—'
  }
}

// Handle edit savings
const handleEdit = (saving: Savings) => {
  startEdit(saving)
}

// Mutation for deleting savings
const deleteSavingsMutation = useMutation({
  mutationFn: async (savingsId: string) => {
    const { error } = await supabase
      .from('savings')
      .delete()
      .eq('id', savingsId)

    if (error) {
      throw error
    }
    return savingsId
  },
  onMutate: async (savingsId) => {
    const currentUserId = userId.value
    const currentScenarioId = scenario.value?.id
    if (!currentUserId || !currentScenarioId) return

    const queryKey = queryKeys.savings.list(currentUserId, currentScenarioId)
    
    // Cancel any outgoing refetches
    await queryClient.cancelQueries({ queryKey })

    // Snapshot the previous value
    const previousSavings = queryClient.getQueryData<Savings[]>(queryKey)

    // Optimistically remove the savings
    queryClient.setQueryData<Savings[]>(queryKey, (old) => {
      if (!old) return old
      return old.filter((saving) => saving.id !== savingsId)
    })

    return { previousSavings }
  },
  onError: (error, _savingsId, context) => {
    const currentUserId = userId.value
    const currentScenarioId = scenario.value?.id
    if (!currentUserId || !currentScenarioId || !context?.previousSavings) return

    // Rollback to previous value on error
    const queryKey = queryKeys.savings.list(currentUserId, currentScenarioId)
    queryClient.setQueryData(queryKey, context.previousSavings)
    
    console.error('Failed to delete savings:', error)
  },
  onSuccess: () => {
    // Invalidate queries to trigger refetch from 'savings_decrypted' view if available
    // This ensures we get properly decrypted data
    queryClient.invalidateQueries({ queryKey: queryKeys.savings.all })
    queryClient.invalidateQueries({ queryKey: queryKeys.summary.all })
  },
})

// Handle delete savings
const handleDelete = async (saving: Savings) => {
  const confirmMessage = t('savings_delete_confirm', { name: saving.comment })
  const confirmed = window.confirm(confirmMessage)
  
  if (!confirmed) {
    return
  }

  deleteSavingsMutation.mutate(saving.id)
}

const handleAddSavings = () => {
  showModal.value = true
}
</script>
