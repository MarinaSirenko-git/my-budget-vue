import { computed, type MaybeRefOrGetter } from 'vue'
import { useIncomes } from './useIncomes'
import { useExpenses } from './useExpenses'
import { useGoals } from './useGoals'

export interface Summary {
  income: number
  savings: number
  expense: number
  goal: number
  balance: number
}

/**
 * Composable for calculating financial summary
 * Uses totalAmount from composables which already handle currency conversion
 */
export const useSummary = (scenarioId: MaybeRefOrGetter<string | null | undefined>) => {
  // Get totals from composables (already computed with currency conversion)
  const { totalAmount: incomeTotal } = useIncomes(scenarioId)
  const { totalAmount: expenseTotal } = useExpenses(scenarioId)
  const { totalMonthlyPayments: goalTotal } = useGoals(scenarioId)


  // Calculate summary from composable totals
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
