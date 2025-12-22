import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { useCurrentUser } from './useCurrentUser'
import { useCurrentScenario } from './useCurrentScenario'
import { useIncomes } from './useIncomes'
import { useExpenses } from './useExpenses'
import { useGoals } from './useGoals'
import { queryKeys } from '@/lib/queryKeys'

export interface Summary {
  income: number
  savings: number
  expense: number
  goal: number
  balance: number
}

/**
 * Composable for calculating financial summary
 * Uses select for optimized computations - sums are calculated directly from cache
 */
export const useSummary = (scenarioId: MaybeRefOrGetter<string | null | undefined>) => {
  const { userId } = useCurrentUser()
  const { scenario } = useCurrentScenario()

  const baseCurrency = computed(() => scenario.value?.base_currency ?? null)
  const currentScenarioId = computed(() => toValue(scenarioId))

  // Get data from composables (these queries are already cached)
  const { 
    incomes, 
    convertedAmounts: incomesConverted,
    isLoadingConverted: isLoadingIncomesConverted,
    isFetchingConverted: isFetchingIncomesConverted
  } = useIncomes(scenarioId)
  const { 
    expenses, 
    convertedAmounts: expensesConverted,
    isLoadingConverted: isLoadingExpensesConverted,
    isFetchingConverted: isFetchingExpensesConverted
  } = useExpenses(scenarioId)
  const { 
    goals, 
    convertedAmounts: goalsConverted,
    isLoadingConverted: isLoadingGoalsConverted,
    isFetchingConverted: isFetchingGoalsConverted
  } = useGoals(scenarioId)

  // Use select to compute income total directly from cached data
  // This avoids storing the full array in memory for summary calculations
  const incomeTotalQueryKey = computed(() => [
    ...queryKeys.summary.incomeTotal(userId.value, currentScenarioId.value ?? null, baseCurrency.value ?? null),
    incomes.value?.length ?? 0, // Include length to trigger recalculation when data changes
    incomesConverted.value ? Object.keys(incomesConverted.value).length : 0, // Include converted amounts count
  ])

  const {
    data: incomeTotal,
  } = useQuery<number>({
    queryKey: incomeTotalQueryKey,
    queryFn: () => Promise.resolve(0), // Never called, select handles computation
    select: () => {
      if (!incomes.value || incomes.value.length === 0 || !baseCurrency.value) {
        return 0
      }

      return incomes.value.reduce((sum, incomeItem) => {
        if (incomeItem.currency === baseCurrency.value) {
          // Use original amount if currency matches base currency
          const amount = typeof incomeItem.amount === 'number' ? incomeItem.amount : 0
          return sum + amount
        }
        // Use converted amount if available
        const converted = incomesConverted.value?.[incomeItem.id]
        if (converted != null && typeof converted === 'number') {
          return sum + converted
        }
        // If conversion is still loading, don't log warning - it's expected
        if (isLoadingIncomesConverted.value || isFetchingIncomesConverted.value) {
          return sum
        }
        // Only log warning if conversion query is done but data is missing
        console.warn(`[useSummary] No converted amount for income ${incomeItem.id} (${incomeItem.currency})`)
        return sum
      }, 0)
    },
    enabled: computed(() => !!userId.value && !!currentScenarioId.value && !!baseCurrency.value),
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  })

  // Use select to compute expense total directly from cached data
  const expenseTotalQueryKey = computed(() => [
    ...queryKeys.summary.expenseTotal(userId.value, currentScenarioId.value ?? null, baseCurrency.value ?? null),
    expenses.value?.length ?? 0,
    expensesConverted.value ? Object.keys(expensesConverted.value).length : 0, // Include converted amounts count
  ])

  const {
    data: expenseTotal,
  } = useQuery<number>({
    queryKey: expenseTotalQueryKey,
    queryFn: () => Promise.resolve(0),
    select: () => {
      if (!expenses.value || expenses.value.length === 0 || !baseCurrency.value) {
        return 0
      }

      return expenses.value.reduce((sum, expenseItem) => {
        if (expenseItem.currency === baseCurrency.value) {
          // Use original amount if currency matches base currency
          const amount = typeof expenseItem.amount === 'number' ? expenseItem.amount : 0
          return sum + amount
        }
        // Use converted amount if available
        const converted = expensesConverted.value?.[expenseItem.id]
        if (converted != null && typeof converted === 'number') {
          return sum + converted
        }
        // If conversion is still loading, don't log warning - it's expected
        if (isLoadingExpensesConverted.value || isFetchingExpensesConverted.value) {
          return sum
        }
        // Only log warning if conversion query is done but data is missing
        console.warn(`[useSummary] No converted amount for expense ${expenseItem.id} (${expenseItem.currency})`)
        return sum
      }, 0)
    },
    enabled: computed(() => !!userId.value && !!currentScenarioId.value && !!baseCurrency.value),
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  })

  // Use select to compute goal total directly from cached data
  const goalTotalQueryKey = computed(() => [
    ...queryKeys.summary.goalTotal(userId.value, currentScenarioId.value ?? null, baseCurrency.value ?? null),
    goals.value?.length ?? 0,
    goalsConverted.value ? Object.keys(goalsConverted.value).length : 0, // Include converted amounts count
  ])

  const {
    data: goalTotal,
  } = useQuery<number>({
    queryKey: goalTotalQueryKey,
    queryFn: () => Promise.resolve(0),
    select: () => {
      if (!goals.value || goals.value.length === 0 || !baseCurrency.value) {
        return 0
      }

      return goals.value.reduce((sum, goalItem) => {
        if (goalItem.currency === baseCurrency.value) {
          // Use original amount if currency matches base currency
          const amount = typeof goalItem.target_amount === 'number' ? goalItem.target_amount : 0
          return sum + amount
        }
        // Use converted amount if available
        const converted = goalsConverted.value?.[goalItem.id]
        if (converted != null && typeof converted === 'number') {
          return sum + converted
        }
        // If conversion is still loading, don't log warning - it's expected
        if (isLoadingGoalsConverted.value || isFetchingGoalsConverted.value) {
          return sum
        }
        // Only log warning if conversion query is done but data is missing
        console.warn(`[useSummary] No converted amount for goal ${goalItem.id} (${goalItem.currency})`)
        return sum
      }, 0)
    },
    enabled: computed(() => !!userId.value && !!currentScenarioId.value && !!baseCurrency.value),
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  })

  // Calculate summary from optimized queries
  const summary = computed<Summary>(() => {
    const income = incomeTotal.value ?? 0
    const expense = expenseTotal.value ?? 0
    const goal = goalTotal.value ?? 0
    const savings = 0 // Not implemented yet
    const balance = income - expense - goal

    return {
      income,
      savings,
      expense,
      goal,
      balance,
    }
  })

  return {
    summary,
  }
}
