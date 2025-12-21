import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { supabase } from './useSupabase'
import { useCurrentUser } from './useCurrentUser'

export interface Goal {
  id: string
  created_at: string
  user_id: string
  name: string
  target_amount: number
  current_amount: number | null
  target_date: string | null
  currency: string
  scenario_id: string
}

/**
 * Composable for fetching goals
 * Uses Vue Query for caching and automatic state management
 */
export const useGoals = (scenarioId: MaybeRefOrGetter<string | null | undefined>) => {
  const { userId } = useCurrentUser()
  const queryClient = useQueryClient()

  const queryKey = computed(() => {
    return ['goals', userId.value, toValue(scenarioId)]
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
    return queryClient.getQueryData<Goal[]>(['goals', currentUserId, currentScenarioId])
  }

  const {
    data: goals,
    isLoading,
    isFetching,
    isError,
    error,
    dataUpdatedAt,
  } = useQuery<Goal[]>({
    queryKey,
    queryFn: async () => {
      const currentScenarioId = toValue(scenarioId)
      if (!userId.value || !currentScenarioId) {
        return []
      }

      // Try to use decrypted view if available, otherwise use regular table
      const { data, error: goalsError } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId.value)
        .eq('scenario_id', currentScenarioId)
        .order('created_at', { ascending: false })

      if (goalsError) {
        console.error('[useGoals] queryFn: ERROR', goalsError)
        throw goalsError
      }

      return data || []
    },
    enabled,
    initialData: getInitialData,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  })

  // Check if data has been loaded at least once
  const isDataLoaded = computed(() => {
    return enabled.value && dataUpdatedAt.value > 0
  })

  const totalTargetAmount = computed(() => {
    if (!goals.value || goals.value.length === 0) {
      return 0
    }
    return goals.value.reduce((sum, goal) => sum + (goal.target_amount || 0), 0)
  })

  const totalCurrentAmount = computed(() => {
    if (!goals.value || goals.value.length === 0) {
      return 0
    }
    return goals.value.reduce((sum, goal) => sum + (goal.current_amount || 0), 0)
  })

  return {
    goals,
    isLoading,
    isFetching,
    isError,
    error,
    totalTargetAmount,
    totalCurrentAmount,
    isDataLoaded,
  }
}
