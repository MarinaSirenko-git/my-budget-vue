<template>
  <div>
    <div v-if="isLoading" class="flex items-center justify-center py-12">
      <p class="text-gray-700">{{ t('loading') }}</p>
    </div>

    <div v-else-if="hasSavings">
      <h2 class="mb-1 text-base font-semibold text-gray-900">
        Накопления
      </h2>

      <DataTable
        :columns="tableColumns"
        :data="displaySavings"
        row-key="id"
        size="xs"
        :show-currency-dropdown="false"
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
      </DataTable>

      <div class="mt-1 border border-gray-800 bg-white px-2 py-1 text-xs text-gray-900">
        Итог: <span class="font-semibold">{{ totalBaseCurrencyFormatted }}</span>
      </div>
    </div>

    <div v-else class="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center">
      <p class="text-gray-800 font-medium">{{ t('savings_empty_title') }}</p>
      <p class="text-gray-500 text-sm">{{ t('savings_empty_subtitle') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import i18next from 'i18next'
import DataTable, { type TableColumn } from '@/components/DataTable.vue'
import { useTranslation } from '@/i18n'
import { useCurrentScenario } from '@/composables/useCurrentScenario'
import { useSavings, type Savings } from '@/composables/useSavings'
import { useDisplayCurrencyConversion } from '@/composables/useDisplayCurrencyConversion'
import { getCapitalizationPeriodLabel, type CapitalizationPeriodCode } from '@/constants/capitalizationPeriod'
import { calculateInterestSinceDate } from '@/utils/compoundInterest'
import type { CurrencyCode } from '@/constants/currency'

const { t } = useTranslation()
const localeString = computed(() => i18next.language || 'en-US')

const currentLocale = computed<'en' | 'ru'>(() => {
  const lang = i18next.language || i18next.languages?.[0] || 'en'
  return lang.startsWith('ru') ? 'ru' : 'en'
})

const { scenario, isLoading: isScenarioLoading } = useCurrentScenario()
const scenarioId = computed(() => scenario.value?.id ?? null)

const {
  savings,
  isLoading: isSavingsLoading,
  isFetching: isSavingsFetching,
} = useSavings(scenarioId)

const displaySavings = computed(() => savings.value ?? [])

const isLoading = computed(() => isScenarioLoading.value || isSavingsLoading.value || isSavingsFetching.value)
const hasSavings = computed(() => displaySavings.value.length > 0)

const displayBaseCurrency = ref<CurrencyCode | null>(null)
watch(
  () => scenario.value?.base_currency,
  (currency) => {
    if (currency) {
      displayBaseCurrency.value = currency as CurrencyCode
    }
  },
  { immediate: true }
)

const { convertedAmounts, isLoading: isLoadingConverted, isFetching: isFetchingConverted } =
  useDisplayCurrencyConversion(savings, displayBaseCurrency, 'savings')

// Check if any savings have interest rate
const hasInterestRate = computed(() => {
  return displaySavings.value?.some(saving => saving.interest_rate !== null && saving.interest_rate !== undefined) ?? false
})

// Check if any savings have capitalization period
const hasCapitalizationPeriod = computed(() => {
  return displaySavings.value?.some(saving => saving.capitalization_period !== null && saving.capitalization_period !== undefined) ?? false
})

// Check if any savings have interest earned (have all required fields for calculation)
const hasInterestEarned = computed(() => {
  return displaySavings.value?.some(saving => 
    saving.interest_rate !== null && 
    saving.interest_rate !== undefined &&
    saving.capitalization_period !== null &&
    saving.capitalization_period !== undefined &&
    (saving.deposit_date !== null || saving.created_at !== null)
  ) ?? false
})

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

  return columns
})

const formatCurrency = (amount: number, currency: string) => {
  if (amount == null || Number.isNaN(amount) || !currency) {
    return '—'
  }

  try {
    return new Intl.NumberFormat(localeString.value, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch (error) {
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
  const convertedPrincipal = convertedAmounts.value?.[saving.id]
  if (convertedPrincipal !== undefined && convertedPrincipal !== null) {
    // Calculate conversion rate
    const conversionRate = convertedPrincipal / saving.amount
    // Apply same rate to total amount
    const convertedTotal = totalAmount * conversionRate
    return formatCurrency(convertedTotal, targetCurrency)
  }
  
  // If conversion is still loading, show loading indicator or original amount
  if (isLoadingConverted.value || isFetchingConverted.value) {
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

// Calculate total in base currency (principal + interest for each saving)
const totalBaseCurrency = computed(() => {
  const targetCurrency = displayBaseCurrency.value
  if (!targetCurrency || !displaySavings.value.length) return null

  return displaySavings.value.reduce((sum, saving) => {
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
          // Continue with just principal if calculation fails
        }
      }
    }
    
    // If saving currency matches target currency, add the total amount
    if (saving.currency === targetCurrency) {
      return sum + totalAmount
    }
    
    // For currency conversion, convert the total amount
    const convertedPrincipal = convertedAmounts.value?.[saving.id]
    if (convertedPrincipal !== undefined && convertedPrincipal !== null) {
      // Calculate conversion rate
      const conversionRate = convertedPrincipal / saving.amount
      // Apply same rate to total amount
      const convertedTotal = totalAmount * conversionRate
      return sum + convertedTotal
    }
    
    // If conversion not available yet, skip this value
    return sum
  }, 0)
})

const totalBaseCurrencyFormatted = computed(() => {
  if (!displayBaseCurrency.value) return '—'
  if (totalBaseCurrency.value === null) return '—'
  return formatCurrency(totalBaseCurrency.value, displayBaseCurrency.value)
})
</script>


