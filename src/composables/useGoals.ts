import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { supabase } from './useSupabase'
import { useCurrentUser } from './useCurrentUser'
import { useCurrentScenario } from './useCurrentScenario'
import { useAmounts } from './useAmounts'
import { useGoalSavingsAllocations } from './useGoalSavingsAllocations'
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
        .from('goals_decrypted')
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

  // Load allocations to account for them in monthly payment calculation
  const { allocations: allAllocations } = useGoalSavingsAllocations(scenarioId)

  // Calculate monthly payments for each goal
  // Takes into account savings allocations - reduces target amount by allocations
  const monthlyPayments = computed(() => {
    if (!goals.value || goals.value.length === 0) return {}
    
    const payments: Record<string, number> = {}
    
    goals.value.forEach((goal) => {
      if (!goal.target_date) {
        payments[goal.id] = 0
        return
      }
      
      // Calculate total months from creation to target date
      const createdDate = new Date(goal.created_at)
      const targetDate = new Date(goal.target_date)
      
      // Set to start of day for accurate calculation
      createdDate.setHours(0, 0, 0, 0)
      targetDate.setHours(0, 0, 0, 0)
      
      const yearsDiff = targetDate.getFullYear() - createdDate.getFullYear()
      const monthsDiff = targetDate.getMonth() - createdDate.getMonth()
      const totalMonths = Math.max(1, yearsDiff * 12 + monthsDiff)
      
      // Get total allocations for this goal (in goal currency)
      const allocationsTotal = allAllocations.value
        ? allAllocations.value
            .filter(a => a.goal_id === goal.id && a.currency === goal.currency)
            .reduce((sum, a) => sum + a.amount_used, 0)
        : 0
      
      // Calculate remaining amount to save (target - allocations)
      const remainingAmount = Math.max(0, goal.target_amount - allocationsTotal)
      
      // Calculate monthly payment (round up to nearest cent)
      const monthly = remainingAmount / totalMonths
      payments[goal.id] = Math.ceil(monthly * 100) / 100
    })
    
    return payments
  })

  // Query for converted monthly payments in base currency
  const convertedMonthlyPaymentsQueryKey = computed(() => {
    // Include goals length to trigger recalculation when goals change
    return [
      ...queryKeys.goals.converted(userId.value, toValue(scenarioId) ?? null, baseCurrency.value ?? null),
      'monthly-payments',
      goals.value?.length ?? 0,
    ]
  })

  const convertedMonthlyPaymentsEnabled = computed(() => {
    return (
      !!userId.value &&
      !!toValue(scenarioId) &&
      !!baseCurrency.value &&
      !!goals.value &&
      goals.value.length > 0
    )
  })

  const {
    data: convertedMonthlyPayments,
    isLoading: isLoadingMonthlyConverted,
    isFetching: isFetchingMonthlyConverted,
  } = useQuery<Record<string, number>>({
    queryKey: convertedMonthlyPaymentsQueryKey,
    queryFn: async () => {
      const currentGoals = goals.value
      const currentBaseCurrency = baseCurrency.value
      const currentMonthlyPayments = monthlyPayments.value

      if (!currentGoals || !currentBaseCurrency || Object.keys(currentMonthlyPayments).length === 0) {
        return {}
      }

      // Filter goals that need conversion (currency differs from base currency)
      const goalsToConvert = currentGoals.filter(
        (goal) =>
          goal.currency !== currentBaseCurrency &&
          typeof currentMonthlyPayments[goal.id] === 'number' &&
          currentMonthlyPayments[goal.id] > 0 &&
          typeof goal.currency === 'string' &&
          goal.currency != null
      )

      // If no goals need conversion, return empty map
      if (goalsToConvert.length === 0) {
        return {}
      }

      // Prepare items for bulk conversion with monthly payment amounts
      const items = goalsToConvert.map((goal) => ({
        amount: currentMonthlyPayments[goal.id],
        currency: goal.currency as string,
      }))

      // Call bulk conversion
      const convertedData = await convertAmountsBulk(items, currentBaseCurrency)

      if (!convertedData || !Array.isArray(convertedData)) {
        console.warn('[useGoals] No converted monthly payments data returned from convertAmountsBulk')
        return {}
      }

      // Create map: goal id -> converted monthly payment (rounded to 2 decimal places)
      const convertedMap: Record<string, number> = {}
      goalsToConvert.forEach((goal, index) => {
        const convertedItem = convertedData[index]
        if (convertedItem && typeof convertedItem === 'object' && 'converted_amount' in convertedItem) {
          const convertedAmount = convertedItem.converted_amount as number
          convertedMap[goal.id] = Math.round(convertedAmount * 100) / 100 // Round to 2 decimal places
        }
      })

      return convertedMap
    },
    enabled: convertedMonthlyPaymentsEnabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })

  // Calculate total monthly payments in base currency
  const totalMonthlyPayments = computed(() => {
    if (!goals.value || goals.value.length === 0) {
      return 0
    }
    
    if (!baseCurrency.value) {
      // If no base currency, sum all monthly payments in their original currencies
      return Object.values(monthlyPayments.value).reduce((sum, payment) => sum + payment, 0)
    }
    
    return goals.value.reduce((sum, goal) => {
      const monthlyPayment = monthlyPayments.value[goal.id] || 0
      
      if (goal.currency === baseCurrency.value) {
        return sum + monthlyPayment
      }

      const converted = convertedMonthlyPayments.value?.[goal.id]
      if (converted != null && typeof converted === 'number') {
        return sum + converted
      }

      if (isLoadingMonthlyConverted.value || isFetchingMonthlyConverted.value) {
        return sum
      }

      console.warn(`[useGoals] No converted monthly payment for goal ${goal.id} (${goal.currency})`)
      return sum
    }, 0)
  })

  return {
    goals,
    isLoading,
    isFetching,
    isError,
    error,
    totalTargetAmount,
    totalCurrentAmount,
    totalMonthlyPayments,
    isDataLoaded,
    convertedAmounts,
    isLoadingConverted,
    isFetchingConverted,
    monthlyPayments,
    convertedMonthlyPayments,
    isLoadingMonthlyConverted,
    isFetchingMonthlyConverted,
  }
}
