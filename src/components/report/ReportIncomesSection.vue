<template>
  <div>
    <div v-if="isLoading" class="flex items-center justify-center py-12">
      <p class="text-gray-700">{{ t('loading') }}</p>
    </div>

    <div v-else-if="hasIncomes">
      <h2 class="mb-1 text-base font-semibold text-gray-900">
        Доходы
      </h2>

      <DataTable
        :columns="tableColumns"
        :data="displayIncomes"
        row-key="id"
        size="xs"
        :show-currency-dropdown="false"
      >
        <template #cell-amount="{ row }">
          {{ formatCurrency(row.amount, row.currency) }}
        </template>

        <template #cell-base_currency="{ row }">
          {{ formatBaseCurrency(row) }}
        </template>

        <template #cell-frequency="{ row }">
          {{ formatFrequency(row.frequency) }}
        </template>
      </DataTable>

      <div class="mt-1 border border-gray-800 bg-white px-2 py-1 text-xs text-gray-900">
        Итог: <span class="font-semibold">{{ totalBaseCurrencyFormatted }}</span>
      </div>
    </div>

    <div v-else class="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center">
      <p class="text-gray-800 font-medium">{{ t('income_empty_title') }}</p>
      <p class="text-gray-500 text-sm">{{ t('income_empty_subtitle') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import i18next from 'i18next'
import DataTable, { type TableColumn } from '@/components/DataTable.vue'
import { useTranslation } from '@/i18n'
import { useCurrentScenario } from '@/composables/useCurrentScenario'
import { useIncomes, type Income } from '@/composables/useIncomes'
import { useDisplayCurrencyConversion } from '@/composables/useDisplayCurrencyConversion'
import { getFrequencyLabel, type FrequencyCode } from '@/constants/frequency'
import type { CurrencyCode } from '@/constants/currency'

const { t } = useTranslation()
const localeString = computed(() => i18next.language || 'en-US')

const { scenario, isLoading: isScenarioLoading } = useCurrentScenario()
const scenarioId = computed(() => scenario.value?.id ?? null)

const {
  incomes,
  isLoading: isIncomesLoading,
  isFetching: isIncomesFetching,
} = useIncomes(scenarioId)

const displayIncomes = computed(() => incomes.value ?? [])

const isLoading = computed(() => isScenarioLoading.value || isIncomesLoading.value || isIncomesFetching.value)
const hasIncomes = computed(() => displayIncomes.value.length > 0)

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
  useDisplayCurrencyConversion(incomes, displayBaseCurrency, 'incomes')

const tableColumns = computed<TableColumn[]>(() => [
  {
    key: 'type',
    label: t('income_table_column_category'),
  },
  {
    key: 'amount',
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
])

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

const formatFrequency = (frequency: string) => {
  return getFrequencyLabel(frequency as FrequencyCode) || frequency || '—'
}

const formatBaseCurrency = (income: Income) => {
  const targetCurrency = displayBaseCurrency.value
  if (!targetCurrency) {
    return '—'
  }

  if (income.currency === targetCurrency) {
    return formatCurrency(income.amount, targetCurrency)
  }

  const convertedAmount = convertedAmounts.value?.[income.id]
  if (convertedAmount !== undefined && convertedAmount !== null) {
    return formatCurrency(convertedAmount, targetCurrency)
  }

  if (isLoadingConverted.value || isFetchingConverted.value) {
    return formatCurrency(income.amount, income.currency)
  }

  return '—'
}

const totalBaseCurrency = computed(() => {
  const targetCurrency = displayBaseCurrency.value
  if (!targetCurrency || !displayIncomes.value.length) return null

  return displayIncomes.value.reduce((sum, income) => {
    if (income.currency === targetCurrency) {
      return sum + (income.amount || 0)
    }

    const converted = convertedAmounts.value?.[income.id]
    if (converted !== undefined && converted !== null) {
      return sum + converted
    }

    // Если конвертации пока нет — пропускаем это значение
    return sum
  }, 0)
})

const totalBaseCurrencyFormatted = computed(() => {
  if (!displayBaseCurrency.value) return '—'
  if (totalBaseCurrency.value === null) return '—'
  return formatCurrency(totalBaseCurrency.value, displayBaseCurrency.value)
})
</script>

