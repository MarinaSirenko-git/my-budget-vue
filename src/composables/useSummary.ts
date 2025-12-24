import { computed, type MaybeRefOrGetter } from 'vue'
import { useIncomes } from './useIncomes'
import { useExpenses } from './useExpenses'
import { useGoals } from './useGoals'
import { useSavings } from './useSavings'

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
  const { totalAmountWithInterest: savingsTotal } = useSavings(scenarioId)

  // Calculate summary from composable totals
  const summary = computed<Summary>(() => {
    const income = incomeTotal.value ?? 0
    const expense = expenseTotal.value ?? 0
    const goal = goalTotal.value ?? 0
    const savings = savingsTotal.value ?? 0
    // Balance calculation: Income - Expenses - Monthly Goal Payments
    // Savings are NOT included in balance calculation (they are separate assets)
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
