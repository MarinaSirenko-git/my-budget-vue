import { computed, watch, type MaybeRefOrGetter, toValue } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { supabase } from './useSupabase'
import { useCurrentUser } from './useCurrentUser'

export interface Income {
  id: string
  created_at: string
  user_id: string
  amount: number
  currency: string
  type: string
  frequency: string
  payment_day: string
  scenario_id: string
}

/**
 * Composable for fetching incomes
 * Uses Vue Query for caching and automatic state management
 */
export const useIncomes = (scenarioId: MaybeRefOrGetter<string | null | undefined>) => {
  const { userId } = useCurrentUser()
  const queryClient = useQueryClient()

  const queryKey = computed(() => {
    return ['incomes', userId.value, toValue(scenarioId)]
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
    return queryClient.getQueryData<Income[]>(['incomes', currentUserId, currentScenarioId])
  }

  const {
    data: incomes,
    isLoading,
    isFetching,
    isError,
    error,
    dataUpdatedAt,
  } = useQuery<Income[]>({
    queryKey,
    queryFn: async () => {
      const currentScenarioId = toValue(scenarioId)
      if (!userId.value || !currentScenarioId) {
        return []
      }

      const { data, error: incomesError } = await supabase
        .from('incomes_decrypted')
        .select('*')
        .eq('user_id', userId.value)
        .eq('scenario_id', currentScenarioId)
        .order('created_at', { ascending: false })

      if (incomesError) {
        console.error('[useIncomes] queryFn: ERROR', incomesError)
        throw incomesError
      }

      return data || []
    },
    enabled,
    initialData: getInitialData, // Use data from cache if available
    // Не используем placeholderData - пусть incomes будет undefined пока данные не загружены
    // Это позволит правильно определить состояние загрузки
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  })

  // Проверяем, что данные были загружены хотя бы раз
  // dataUpdatedAt будет 0 если данные еще не загружались
  const isDataLoaded = computed(() => {
    return enabled.value && dataUpdatedAt.value > 0
  })

  const totalAmount = computed(() => {
    if (!incomes.value || incomes.value.length === 0) {
      return 0
    }
    return incomes.value.reduce((sum, income) => sum + (income.amount || 0), 0)
  })


  return {
    incomes,
    isLoading,
    isFetching,
    isError,
    error,
    totalAmount,
    isDataLoaded,
  }
}
