import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { supabase } from './useSupabase'
import { useCurrentUser } from './useCurrentUser'
import { useCurrentScenario } from './useCurrentScenario'
import { useAmounts } from './useAmounts'
import type { CurrencyCode } from '@/constants/currency'
import { queryKeys } from '@/lib/queryKeys'

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
  const { scenario } = useCurrentScenario()
  const { convertAmountsBulk } = useAmounts()

  const queryKey = computed(() => {
    return queryKeys.goals.list(userId.value, toValue(scenarioId) ?? null)
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
    return queryClient.getQueryData<Goal[]>(queryKeys.goals.list(currentUserId, currentScenarioId))
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

  // Query for converted amounts in base currency (for target_amount)
  const baseCurrency = computed(() => {
    return (scenario.value?.base_currency as CurrencyCode | null) ?? null
  })

  const convertedAmountsQueryKey = computed(() => {
    // Include goals length to trigger recalculation when goals change
    return [
      ...queryKeys.goals.converted(userId.value, toValue(scenarioId) ?? null, baseCurrency.value ?? null),
      goals.value?.length ?? 0,
    ]
  })

  const convertedAmountsEnabled = computed(() => {
    return (
      !!userId.value &&
      !!toValue(scenarioId) &&
      !!baseCurrency.value &&
      !!goals.value &&
      goals.value.length > 0
    )
  })

  const {
    data: convertedAmounts,
    isLoading: isLoadingConverted,
    isFetching: isFetchingConverted,
  } = useQuery<Record<string, number>>({
    queryKey: convertedAmountsQueryKey,
    queryFn: async () => {
      const currentGoals = goals.value
      const currentBaseCurrency = baseCurrency.value

      if (!currentGoals || !currentBaseCurrency) {
        return {}
      }

      // Filter goals that need conversion (currency differs from base currency)
      // Also validate that target_amount is a number and currency is a string
      const goalsToConvert = currentGoals.filter(
        (goal) =>
          goal.currency !== currentBaseCurrency &&
          typeof goal.target_amount === 'number' &&
          goal.target_amount != null &&
          typeof goal.currency === 'string' &&
          goal.currency != null
      )

      // If no goals need conversion, return empty map
      if (goalsToConvert.length === 0) {
        return {}
      }

      // Prepare items for bulk conversion with validated data (using target_amount)
      const items = goalsToConvert.map((goal) => ({
        amount: goal.target_amount as number,
        currency: goal.currency as string,
      }))

      // Call bulk conversion
      const convertedData = await convertAmountsBulk(items, currentBaseCurrency)

      if (!convertedData || !Array.isArray(convertedData)) {
        console.warn('[useGoals] No converted data returned from convertAmountsBulk')
        return {}
      }

      // Create map: goal id -> converted amount (rounded to integer)
      const convertedMap: Record<string, number> = {}
      goalsToConvert.forEach((goal, index) => {
        const convertedItem = convertedData[index]
        if (convertedItem && typeof convertedItem === 'object' && 'converted_amount' in convertedItem) {
          const convertedAmount = convertedItem.converted_amount as number
          convertedMap[goal.id] = Math.round(convertedAmount)
        }
      })

      return convertedMap
    },
    enabled: convertedAmountsEnabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })

  const totalTargetAmount = computed(() => {
    if (!goals.value || goals.value.length === 0) {
      return 0
    }
    
    if (!baseCurrency.value) {
      return goals.value.reduce((sum, goal) => sum + (goal.target_amount || 0), 0)
    }
    
    return goals.value.reduce((sum, goal) => {
      if (goal.currency === baseCurrency.value) {
        return sum + (goal.target_amount || 0)
      }

      const converted = convertedAmounts.value?.[goal.id]
      if (converted != null && typeof converted === 'number') {
        return sum + converted
      }

      if (isLoadingConverted.value || isFetchingConverted.value) {
        return sum
      }

      console.warn(`[useGoals] No converted amount for goal ${goal.id} (${goal.currency})`)
      return sum
    }, 0)
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
    convertedAmounts,
    isLoadingConverted,
    isFetchingConverted,
  }
}
