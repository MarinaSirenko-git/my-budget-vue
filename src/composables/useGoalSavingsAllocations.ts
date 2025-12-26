import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { supabase } from './useSupabase'
import { useCurrentUser } from './useCurrentUser'
import { queryKeys } from '@/lib/queryKeys'

export interface GoalSavingsAllocation {
  id: string
  goal_id: string
  savings_id: string
  amount_used: number
  currency: string
  created_at: string
}

/**
 * Composable for fetching goal savings allocations
 * Uses Vue Query for caching and automatic state management
 */
export const useGoalSavingsAllocations = (scenarioId: MaybeRefOrGetter<string | null | undefined>) => {
  const { userId } = useCurrentUser()
  const queryClient = useQueryClient()

  const queryKey = computed(() => {
    return queryKeys.goals.allocations(userId.value, toValue(scenarioId) ?? null)
  })

  const enabled = computed(() => {
    return !!userId.value && !!toValue(scenarioId)
  })

  const getInitialData = () => {
    const currentUserId = userId.value
    const currentScenarioId = toValue(scenarioId)
    if (!currentUserId || !currentScenarioId) {
      return undefined
    }
    return queryClient.getQueryData<GoalSavingsAllocation[]>(
      queryKeys.goals.allocations(currentUserId, currentScenarioId)
    )
  }

  const {
    data: allocations,
    isLoading,
    isFetching,
    isError,
    error,
    dataUpdatedAt,
  } = useQuery<GoalSavingsAllocation[]>({
    queryKey,
    queryFn: async () => {
      const currentScenarioId = toValue(scenarioId)
      if (!userId.value || !currentScenarioId) {
        return []
      }

      // Get all goals in the scenario
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

      // Get all allocations for these goals
      const { data: allocationsData, error: allocationsError } = await supabase
        .from('goal_savings_allocations')
        .select('id, goal_id, savings_id, amount_used, currency, created_at')
        .in('goal_id', goals.map(g => g.id))

      if (allocationsError) {
        console.error('[useGoalSavingsAllocations] Error fetching allocations:', allocationsError)
        throw allocationsError
      }

      return allocationsData || []
    },
    enabled,
    initialData: getInitialData,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })

  // Check if data has been loaded at least once
  const isDataLoaded = computed(() => {
    return enabled.value && dataUpdatedAt.value > 0
  })

  /**
   * Get total amount used for a specific savings_id (excluding a specific goal if provided)
   * Only counts allocations in the same currency as the savings
   */
  const getUsedAmount = (
    savingsId: string,
    savingsCurrency: string,
    excludeGoalId?: string | null
  ): number => {
    if (!allocations.value || allocations.value.length === 0) {
      return 0
    }

    return allocations.value
      .filter(
        (a) =>
          a.savings_id === savingsId &&
          a.currency === savingsCurrency &&
          (!excludeGoalId || a.goal_id !== excludeGoalId)
      )
      .reduce((sum, a) => sum + a.amount_used, 0)
  }

  /**
   * Get available amount for a savings (total - used in other goals)
   */
  const getAvailableAmount = (
    savingsId: string,
    totalAmount: number,
    savingsCurrency: string,
    excludeGoalId?: string | null
  ): number => {
    const usedAmount = getUsedAmount(savingsId, savingsCurrency, excludeGoalId)
    return Math.max(0, totalAmount - usedAmount)
  }

  return {
    allocations,
    isLoading,
    isFetching,
    isError,
    error,
    isDataLoaded,
    getUsedAmount,
    getAvailableAmount,
  }
}

