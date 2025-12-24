<template>
  <div>
    <div v-if="isLoading" class="flex items-center justify-center py-12">
      <p class="text-gray-700">{{ t('loading') }}</p>
    </div>

    <div v-else-if="hasGoals">
      <h2 class="mb-1 text-base font-semibold text-gray-900">
        Цели
      </h2>

      <DataTable
        :columns="tableColumns"
        :data="displayGoals"
        row-key="id"
        size="xs"
        :show-currency-dropdown="false"
      >
        <template #cell-target_amount="{ row }">
          {{ formatCurrency(row.target_amount, row.currency) }}
        </template>

        <template #cell-monthly_payment="{ row }">
          {{ formatMonthlyPayment(row) }}
        </template>

        <template #cell-target_date="{ row }">
          {{ formatDate(row.target_date) }}
        </template>
      </DataTable>
    </div>

    <div v-else class="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center">
      <p class="text-gray-800 font-medium">{{ t('goal_empty_title') }}</p>
      <p class="text-gray-500 text-sm">{{ t('goal_empty_subtitle') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import i18next from 'i18next'
import DataTable, { type TableColumn } from '@/components/DataTable.vue'
import { useTranslation } from '@/i18n'
import { useCurrentScenario } from '@/composables/useCurrentScenario'
import { useGoals } from '@/composables/useGoals'

const { t } = useTranslation()
const localeString = computed(() => i18next.language || 'en-US')

const { scenario, isLoading: isScenarioLoading } = useCurrentScenario()
const scenarioId = computed(() => scenario.value?.id ?? null)

const {
  goals,
  isLoading: isGoalsLoading,
  isFetching: isGoalsFetching,
  monthlyPayments,
} = useGoals(scenarioId)

const displayGoals = computed(() => goals.value ?? [])

const isLoading = computed(() => isScenarioLoading.value || isGoalsLoading.value || isGoalsFetching.value)
const hasGoals = computed(() => displayGoals.value.length > 0)

const tableColumns = computed<TableColumn[]>(() => [
  {
    key: 'name',
    label: 'Название',
  },
  {
    key: 'target_amount',
    label: 'Целевая сумма',
  },
  {
    key: 'monthly_payment',
    label: 'Отчисление в месяц',
  },
  {
    key: 'target_date',
    label: t('goal_form_target_date_label'),
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

const formatDate = (dateString: string | null) => {
  if (!dateString) return '—'
  try {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat(localeString.value, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date)
  } catch (error) {
    return dateString
  }
}

const formatMonthlyPayment = (goal: import('@/composables/useGoals').Goal) => {
  const monthlyPayment = monthlyPayments.value?.[goal.id]
  if (monthlyPayment === undefined || monthlyPayment === null || monthlyPayment === 0) {
    return '—'
  }
  return formatCurrency(monthlyPayment, goal.currency)
}

</script>

