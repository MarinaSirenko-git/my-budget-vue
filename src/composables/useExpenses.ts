import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { supabase } from './useSupabase'
import { useCurrentUser } from './useCurrentUser'
import { useCurrentScenario } from './useCurrentScenario'
import { useAmounts } from './useAmounts'
import type { CurrencyCode } from '@/constants/currency'
import { queryKeys } from '@/lib/queryKeys'

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
  const { scenario } = useCurrentScenario()
  const { convertAmountsBulk } = useAmounts()

  const queryKey = computed(() => {
    return queryKeys.expenses.list(userId.value, toValue(scenarioId) ?? null)
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
    return queryClient.getQueryData<Expense[]>(queryKeys.expenses.list(currentUserId, currentScenarioId))
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

  // Query for converted amounts in base currency
  const baseCurrency = computed(() => {
    return (scenario.value?.base_currency as CurrencyCode | null) ?? null
  })

  const convertedAmountsQueryKey = computed(() => {
    // Include expenses length to trigger recalculation when expenses change
    return [
      ...queryKeys.expenses.converted(userId.value, toValue(scenarioId) ?? null, baseCurrency.value ?? null),
      expenses.value?.length ?? 0,
    ]
  })

  const convertedAmountsEnabled = computed(() => {
    return (
      !!userId.value &&
      !!toValue(scenarioId) &&
      !!baseCurrency.value &&
      !!expenses.value &&
      expenses.value.length > 0
    )
  })

  const {
    data: convertedAmounts,
    isLoading: isLoadingConverted,
    isFetching: isFetchingConverted,
  } = useQuery<Record<string, number>>({
    queryKey: convertedAmountsQueryKey,
    queryFn: async () => {
      const currentExpenses = expenses.value
      const currentBaseCurrency = baseCurrency.value

      if (!currentExpenses || !currentBaseCurrency) {
        return {}
      }

      // Filter expenses that need conversion (currency differs from base currency)
      // Also validate that amount is a number and currency is a string
      const expensesToConvert = currentExpenses.filter(
        (expense) =>
          expense.currency !== currentBaseCurrency &&
          typeof expense.amount === 'number' &&
          expense.amount != null &&
          typeof expense.currency === 'string' &&
          expense.currency != null
      )

      // If no expenses need conversion, return empty map
      if (expensesToConvert.length === 0) {
        return {}
      }

      // Prepare items for bulk conversion with validated data
      const items = expensesToConvert.map((expense) => ({
        amount: expense.amount as number,
        currency: expense.currency as string,
      }))

      // Call bulk conversion
      const convertedData = await convertAmountsBulk(items, currentBaseCurrency)

      if (!convertedData || !Array.isArray(convertedData)) {
        console.warn('[useExpenses] No converted data returned from convertAmountsBulk')
        return {}
      }

      // Create map: expense id -> converted amount (rounded to integer)
      const convertedMap: Record<string, number> = {}
      expensesToConvert.forEach((expense, index) => {
        const convertedItem = convertedData[index]
        if (convertedItem && typeof convertedItem === 'object' && 'converted_amount' in convertedItem) {
          const convertedAmount = convertedItem.converted_amount as number
          convertedMap[expense.id] = Math.round(convertedAmount)
        }
      })

      return convertedMap
    },
    enabled: convertedAmountsEnabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })

  const totalAmount = computed(() => {
    if (!expenses.value || expenses.value.length === 0) {
      return 0
    }
    
    if (!baseCurrency.value) {
      return expenses.value.reduce((sum, expense) => {
        let amount = expense.amount || 0
        // If frequency is annual, divide by 12 to get monthly amount
        if (expense.frequency === 'annual') {
          amount = amount / 12
        }
        return sum + amount
      }, 0)
    }
    
    return expenses.value.reduce((sum, expense) => {
      let amount: number
      
      if (expense.currency === baseCurrency.value) {
        amount = expense.amount || 0
      } else {
        const converted = convertedAmounts.value?.[expense.id]
        if (converted != null && typeof converted === 'number') {
          amount = converted
        } else if (isLoadingConverted.value || isFetchingConverted.value) {
          return sum
        } else {
          console.warn(`[useExpenses] No converted amount for expense ${expense.id} (${expense.currency})`)
          return sum
        }
      }
      
      // If frequency is annual, divide by 12 to get monthly amount
      if (expense.frequency === 'annual') {
        amount = amount / 12
      }
      
      return sum + amount
    }, 0)
  })

  return {
    expenses,
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
