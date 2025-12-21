import { computed, watch, type MaybeRefOrGetter, toValue } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { supabase } from './useSupabase'
import { useCurrentUser } from './useCurrentUser'

export interface Expense {
  id: string
  created_at: string
  user_id: string
  amount: number
  currency: string
  type: string
  frequency: string
  scenario_id: string
}

/**
 * Composable for fetching expenses
 * Uses Vue Query for caching and automatic state management
 */
export const useExpenses = (scenarioId: MaybeRefOrGetter<string | null | undefined>) => {
  const { userId } = useCurrentUser()
  const queryClient = useQueryClient()

  const queryKey = computed(() => {
    return ['expenses', userId.value, toValue(scenarioId)]
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
    return queryClient.getQueryData<Expense[]>(['expenses', currentUserId, currentScenarioId])
  }

  const {
    data: expenses,
    isLoading,
    isFetching,
    isError,
    error,
    dataUpdatedAt,
  } = useQuery<Expense[]>({
    queryKey,
    queryFn: async () => {
      const currentScenarioId = toValue(scenarioId)
      if (!userId.value || !currentScenarioId) {
        return []
      }

      const { data, error: expensesError } = await supabase
        .from('expenses_decrypted')
        .select('*')
        .eq('user_id', userId.value)
        .eq('scenario_id', currentScenarioId)
        .order('created_at', { ascending: false })

      if (expensesError) {
        console.error('[useExpenses] queryFn: ERROR', expensesError)
        throw expensesError
      }

      return data || []
    },
    enabled,
    initialData: getInitialData, // Use data from cache if available
    // Не используем placeholderData - пусть expenses будет undefined пока данные не загружены
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
    if (!expenses.value || expenses.value.length === 0) {
      return 0
    }
    return expenses.value.reduce((sum, expense) => sum + (expense.amount || 0), 0)
  })


  return {
    expenses,
    isLoading,
    isFetching,
    isError,
    error,
    totalAmount,
    isDataLoaded,
  }
}
