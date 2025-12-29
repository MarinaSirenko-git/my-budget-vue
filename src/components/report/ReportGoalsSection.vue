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
        <template #cell-name="{ row }">
          <div class="flex items-center gap-2">
            <span>{{ row.name }}</span>
            <span v-if="isGoalAchieved(row)" class="text-xs text-gray-500">
              ({{ t('goal_achieved') }})
            </span>
            <span v-else class="text-xs text-gray-500">
              ({{ formatRemainingAmount(row) }})
            </span>
          </div>
        </template>

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
import { useGoals, type Goal } from '@/composables/useGoals'
import { useGoalSavingsAllocations, type GoalSavingsAllocation } from '@/composables/useGoalSavingsAllocations'

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

// Load allocations to calculate current amount and remaining amount
const { allocations: allAllocations } = useGoalSavingsAllocations(scenarioId)

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

const formatMonthlyPayment = (goal: Goal) => {
  const monthlyPayment = monthlyPayments.value?.[goal.id]
  if (monthlyPayment === undefined || monthlyPayment === null || monthlyPayment === 0) {
    return '—'
  }
  return formatCurrency(monthlyPayment, goal.currency)
}

/**
 * Get total allocations amount for a goal (in goal currency)
 */
const getGoalAllocationsTotal = (goalId: string, goalCurrency: string): number => {
  if (!allAllocations.value || allAllocations.value.length === 0) {
    return 0
  }

  return allAllocations.value
    .filter((a: GoalSavingsAllocation) => a.goal_id === goalId && a.currency === goalCurrency)
    .reduce((sum: number, a: GoalSavingsAllocation) => sum + a.amount_used, 0)
}

/**
 * Calculate current amount for a goal (similar to GoalCard logic)
 */
const calculateCurrentAmount = (goal: Goal): number => {
  if (!goal.target_date) {
    const baseAmount = goal.current_amount || 0
    return baseAmount + getGoalAllocationsTotal(goal.id, goal.currency)
  }

  // Calculate months from creation to today
  const createdDate = new Date(goal.created_at)
  const today = new Date()
  createdDate.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  
  const yearsDiff = today.getFullYear() - createdDate.getFullYear()
  const monthsDiff = today.getMonth() - createdDate.getMonth()
  const monthsPassed = Math.max(0, yearsDiff * 12 + monthsDiff)

  const monthlyPayment = monthlyPayments.value?.[goal.id] || 0
  const paymentsMade = monthsPassed >= 1 ? monthsPassed : 0
  const calculatedAmount = monthlyPayment * paymentsMade
  const allocationsTotal = getGoalAllocationsTotal(goal.id, goal.currency)
  const totalAmount = calculatedAmount + allocationsTotal

  return Math.min(totalAmount, goal.target_amount)
}

/**
 * Check if goal is achieved
 */
const isGoalAchieved = (goal: Goal): boolean => {
  const currentAmount = calculateCurrentAmount(goal)
  return currentAmount >= goal.target_amount
}

/**
 * Format remaining amount for a goal
 */
const formatRemainingAmount = (goal: Goal): string => {
  const currentAmount = calculateCurrentAmount(goal)
  const remaining = Math.max(0, goal.target_amount - currentAmount)
  
  if (remaining === 0) {
    return t('goal_achieved')
  }
  
  return `${t('goal_remaining')}: ${formatCurrency(remaining, goal.currency)}`
}

</script>

