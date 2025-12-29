import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { supabase } from './useSupabase'
import { useCurrentUser } from './useCurrentUser'
import { queryKeys } from '@/lib/queryKeys'

export interface GoalSavingsAllocation {
  goal_id: string
  savings_id: string
  amount_used: number
  currency: string
}

/**
 * Composable for fetching goal savings allocations
 * Uses Vue Query for caching and automatic state management
 */
export const useGoalSavingsAllocations = (
  scenarioId: MaybeRefOrGetter<string | null | undefined>
) => {
  const { userId } = useCurrentUser()

  const queryKey = computed(() => {
    return queryKeys.goals.allocations(userId.value, toValue(scenarioId) ?? null)
  })

  const enabled = computed(() => {
    return !!userId.value && !!toValue(scenarioId)
  })

  const {
    data: allocations,
    isLoading,
    isFetching,
    isError,
    error,
  } = useQuery<GoalSavingsAllocation[]>({
    queryKey,
    queryFn: async () => {
      const currentScenarioId = toValue(scenarioId)
      if (!userId.value || !currentScenarioId) {
        return []
      }

      // Get all goals for this scenario first
      const { data: goals, error: goalsError } = await supabase
        .from('goals')
        .select('id')
        .eq('user_id', userId.value)
        .eq('scenario_id', currentScenarioId)

      if (goalsError) {
        console.error('[useGoalSavingsAllocations] Error fetching goals:', goalsError)
        throw goalsError
      }

      if (!goals || goals.length === 0) {
        return []
      }

      const goalIds = goals.map(g => g.id)

      // Get all allocations for these goals
      const { data, error: allocationsError } = await supabase
        .from('goal_savings_allocations')
        .select('*')
        .in('goal_id', goalIds)

      if (allocationsError) {
        console.error('[useGoalSavingsAllocations] Error fetching allocations:', allocationsError)
        throw allocationsError
      }

      return (data || []) as GoalSavingsAllocation[]
    },
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })

  /**
   * Get available amount for a savings (total - used in other goals)
   * @param savingsId - ID of the savings
   * @param totalAmount - Total amount of the savings
   * @param currency - Currency of the savings
   * @param excludeGoalId - Optional goal ID to exclude from calculation (when editing)
   * @returns Available amount that can be allocated
   */
  const getAvailableAmount = (
    savingsId: string | null,
    totalAmount: number,
    currency: string,
    excludeGoalId: string | null = null
  ): number => {
    if (!savingsId || !allocations.value) {
      return totalAmount
    }

    // Sum all allocations for this savings (excluding the current goal if editing)
    const usedAmount = allocations.value
      .filter(
        (a) =>
          a.savings_id === savingsId &&
          a.currency === currency &&
          (excludeGoalId === null || a.goal_id !== excludeGoalId)
      )
      .reduce((sum, a) => sum + a.amount_used, 0)

    return Math.max(0, totalAmount - usedAmount)
  }

  return {
    allocations,
    isLoading,
    isFetching,
    isError,
    error,
    getAvailableAmount,
  }
}

