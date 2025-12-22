import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { supabase } from './useSupabase'
import { useCurrentUser } from './useCurrentUser'
import { useCurrentScenario } from './useCurrentScenario'
import { useAmounts } from './useAmounts'
import type { CurrencyCode } from '@/constants/currency'
import { queryKeys } from '@/lib/queryKeys'

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
  const queryClient = useQueryClient()
  const { userId } = useCurrentUser()
  const { scenario } = useCurrentScenario()
  const { convertAmountsBulk } = useAmounts()

  const queryKey = computed(() => {
    return queryKeys.incomes.list(userId.value, toValue(scenarioId) ?? null)
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
    return queryClient.getQueryData<Income[]>(queryKeys.incomes.list(currentUserId, currentScenarioId))
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
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  })

  const isDataLoaded = computed(() => {
    return enabled.value && dataUpdatedAt.value > 0
  })

  const totalAmount = computed(() => {
    if (!incomes.value || incomes.value.length === 0) {
      return 0
    }
    
    if (!baseCurrency.value) {
      return incomes.value.reduce((sum, income) => sum + (income.amount || 0), 0)
    }
    
    return incomes.value.reduce((sum, income) => {
      if (income.currency === baseCurrency.value) {
        return sum + (income.amount || 0)
      }

      const converted = convertedAmounts.value?.[income.id]
      if (converted != null && typeof converted === 'number') {
        return sum + converted
      }

      if (isLoadingConverted.value || isFetchingConverted.value) {
        return 0
      }

      console.warn(`[useIncomes] No converted amount for income ${income.id} (${income.currency})`)
      return 0
    }, 0)
  })

  // Query for converted amounts in base currency
  const baseCurrency = computed(() => {
    return (scenario.value?.base_currency as CurrencyCode | null) ?? null
  })

  const convertedAmountsQueryKey = computed(() => {
    // Include incomes length to trigger recalculation when incomes change
    return [
      ...queryKeys.incomes.converted(userId.value, toValue(scenarioId) ?? null, baseCurrency.value ?? null),
      incomes.value?.length ?? 0,
    ]
  })

  const convertedAmountsEnabled = computed(() => {
    return (
      !!userId.value &&
      !!toValue(scenarioId) &&
      !!baseCurrency.value &&
      !!incomes.value &&
      incomes.value.length > 0
    )
  })

  const {
    data: convertedAmounts,
    isLoading: isLoadingConverted,
    isFetching: isFetchingConverted,
  } = useQuery<Record<string, number>>({
    queryKey: convertedAmountsQueryKey,
    queryFn: async () => {
      const currentIncomes = incomes.value
      const currentBaseCurrency = baseCurrency.value

      if (!currentIncomes || !currentBaseCurrency) {
        return {}
      }

      // Log incomes with null amount for debugging
      const incomesWithNullAmount = currentIncomes.filter(
        (income) => income.amount === null || typeof income.amount !== 'number'
      )
      if (incomesWithNullAmount.length > 0) {
        console.warn('[useIncomes] Found incomes with null or invalid amount:', incomesWithNullAmount)
      }

      // Filter incomes that need conversion (currency differs from base currency)
      // Also validate that amount is a number and currency is a string
      const incomesToConvert = currentIncomes.filter(
        (income) =>
          income.currency !== currentBaseCurrency &&
          typeof income.amount === 'number' &&
          income.amount != null &&
          typeof income.currency === 'string' &&
          income.currency != null
      )

      // If no incomes need conversion, return empty map
      if (incomesToConvert.length === 0) {
        console.warn('[useIncomes] No incomes to convert. Total incomes:', currentIncomes.length, 'Base currency:', currentBaseCurrency)
        return {}
      }

      // Prepare items for bulk conversion with validated data
      const items = incomesToConvert.map((income) => ({
        amount: income.amount as number,
        currency: income.currency as string,
      }))

      // Call bulk conversion
      const convertedData = await convertAmountsBulk(items, currentBaseCurrency)

      if (!convertedData || !Array.isArray(convertedData)) {
        console.warn('[useIncomes] No converted data returned from convertAmountsBulk')
        return {}
      }

      // Create map: income id -> converted amount (rounded to integer)
      const convertedMap: Record<string, number> = {}
      incomesToConvert.forEach((income, index) => {
        const convertedItem = convertedData[index]
        if (convertedItem && typeof convertedItem === 'object' && 'converted_amount' in convertedItem) {
          const convertedAmount = convertedItem.converted_amount as number
          convertedMap[income.id] = Math.round(convertedAmount)
        }
      })

      return convertedMap
    },
    enabled: convertedAmountsEnabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })

  return {
    incomes,
    isLoading,
    isFetching,
    isError,
    error,
    totalAmount,
    isDataLoaded,
    convertedAmounts,
    isLoadingConverted,
    isFetchingConverted,
  }
}
