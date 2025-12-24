import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { supabase } from './useSupabase'
import { useCurrentUser } from './useCurrentUser'
import { useCurrentScenario } from './useCurrentScenario'
import { useAmounts } from './useAmounts'
import type { CurrencyCode } from '@/constants/currency'
import { calculateInterestSinceDate } from '@/utils/compoundInterest'
import type { CapitalizationPeriodCode } from '@/constants/capitalizationPeriod'
import { queryKeys } from '@/lib/queryKeys'

export interface Savings {
  id: string
  created_at: string
  user_id: string
  amount: number
  comment: string
  currency: string
  scenario_id: string
  interest_rate: number | null
  capitalization_period: string | null
  deposit_date: string | null
}

/**
 * Composable for fetching savings
 * Uses Vue Query for caching and automatic state management
 */
export const useSavings = (scenarioId: MaybeRefOrGetter<string | null | undefined>) => {
  const { userId } = useCurrentUser()
  const queryClient = useQueryClient()
  const { scenario } = useCurrentScenario()
  const { convertAmountsBulk } = useAmounts()

  const queryKey = computed(() => {
    return queryKeys.savings.list(userId.value, toValue(scenarioId) ?? null)
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
    return queryClient.getQueryData<Savings[]>(queryKeys.savings.list(currentUserId, currentScenarioId))
  }

  const {
    data: savings,
    isLoading,
    isFetching,
    isError,
    error,
    dataUpdatedAt,
  } = useQuery<Savings[]>({
    queryKey,
    queryFn: async () => {
      const currentScenarioId = toValue(scenarioId)
      if (!userId.value || !currentScenarioId) {
        return []
      }

      // Try to use decrypted view if available, otherwise use regular table
      const { data, error: savingsError } = await supabase
        .from('savings_decrypted')
        .select('*')
        .eq('user_id', userId.value)
        .eq('scenario_id', currentScenarioId)
        .order('created_at', { ascending: false })

      if (savingsError) {
        // If decrypted view doesn't exist, try regular table
        const { data: regularData, error: regularError } = await supabase
          .from('savings')
          .select('*')
          .eq('user_id', userId.value)
          .eq('scenario_id', currentScenarioId)
          .order('created_at', { ascending: false })

        if (regularError) {
          console.error('[useSavings] queryFn: ERROR', regularError)
          throw regularError
        }

        return regularData || []
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

  const totalAmount = computed(() => {
    if (!savings.value || savings.value.length === 0) {
      return 0
    }
    return savings.value.reduce((sum, saving) => sum + (saving.amount || 0), 0)
  })

  // Query for converted amounts in base currency
  const baseCurrency = computed(() => {
    return (scenario.value?.base_currency as CurrencyCode | null) ?? null
  })

  const convertedAmountsQueryKey = computed(() => {
    return [
      ...queryKeys.savings.list(userId.value, toValue(scenarioId) ?? null),
      'converted',
      baseCurrency.value ?? null,
      savings.value?.length ?? 0,
    ]
  })

  const convertedAmountsEnabled = computed(() => {
    return (
      !!userId.value &&
      !!toValue(scenarioId) &&
      !!baseCurrency.value &&
      !!savings.value &&
      savings.value.length > 0
    )
  })

  const {
    data: convertedAmounts,
    isLoading: isLoadingConverted,
    isFetching: isFetchingConverted,
  } = useQuery<Record<string, number>>({
    queryKey: convertedAmountsQueryKey,
    queryFn: async () => {
      const currentSavings = savings.value
      const currentBaseCurrency = baseCurrency.value

      if (!currentSavings || !currentBaseCurrency) {
        return {}
      }

      // Calculate total amount (principal + interest) for each saving that needs conversion
      const savingsToConvert = currentSavings
        .filter(saving => saving.currency !== currentBaseCurrency)
        .map(saving => {
          let totalAmount = saving.amount
          
          // Add interest if available
          if (saving.interest_rate && saving.capitalization_period) {
            const startDate = saving.deposit_date || saving.created_at
            if (startDate) {
              try {
                const interest = calculateInterestSinceDate(
                  saving.amount,
                  saving.interest_rate,
                  saving.capitalization_period as CapitalizationPeriodCode,
                  startDate
                )
                totalAmount = saving.amount + interest
              } catch (error) {
                console.error('[useSavings] Error calculating interest for conversion:', error)
              }
            }
          }
          
          return {
            amount: totalAmount,
            currency: saving.currency,
          }
        })

      if (savingsToConvert.length === 0) {
        return {}
      }

      // Call bulk conversion
      const convertedData = await convertAmountsBulk(savingsToConvert, currentBaseCurrency)

      if (!convertedData || !Array.isArray(convertedData)) {
        console.warn('[useSavings] No converted data returned from convertAmountsBulk')
        return {}
      }

      // Create map: saving id -> converted total amount
      const convertedMap: Record<string, number> = {}
      const savingsNeedingConversion = currentSavings.filter(
        saving => saving.currency !== currentBaseCurrency
      )
      
      savingsNeedingConversion.forEach((saving, index) => {
        const convertedItem = convertedData[index]
        if (convertedItem && typeof convertedItem === 'object' && 'converted_amount' in convertedItem) {
          const convertedAmount = convertedItem.converted_amount as number
          convertedMap[saving.id] = Math.round(convertedAmount)
        }
      })

      return convertedMap
    },
    enabled: convertedAmountsEnabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })

  // Calculate total amount with interest, converted to base currency
  const totalAmountWithInterest = computed(() => {
    if (!savings.value || savings.value.length === 0) {
      return 0
    }
    
    if (!baseCurrency.value) {
      // If no base currency, sum all amounts with interest in their original currencies
      return savings.value.reduce((sum, saving) => {
        let totalAmount = saving.amount
        
        // Add interest if available
        if (saving.interest_rate && saving.capitalization_period) {
          const startDate = saving.deposit_date || saving.created_at
          if (startDate) {
            try {
              const interest = calculateInterestSinceDate(
                saving.amount,
                saving.interest_rate,
                saving.capitalization_period as CapitalizationPeriodCode,
                startDate
              )
              totalAmount = saving.amount + interest
            } catch (error) {
              console.error('[useSavings] Error calculating interest:', error)
            }
          }
        }
        
        return sum + totalAmount
      }, 0)
    }
    
    return savings.value.reduce((sum, saving) => {
      // Calculate total amount (principal + interest) for this saving
      let totalAmount = saving.amount
      
      if (saving.interest_rate && saving.capitalization_period) {
        const startDate = saving.deposit_date || saving.created_at
        if (startDate) {
          try {
            const interest = calculateInterestSinceDate(
              saving.amount,
              saving.interest_rate,
              saving.capitalization_period as CapitalizationPeriodCode,
              startDate
            )
            totalAmount = saving.amount + interest
          } catch (error) {
            console.error('[useSavings] Error calculating interest:', error)
          }
        }
      }
      
      // If saving currency matches base currency, use total amount directly
      if (saving.currency === baseCurrency.value) {
        return sum + totalAmount
      }
      
      // Use converted amount from conversion query
      const converted = convertedAmounts.value?.[saving.id]
      if (converted != null && typeof converted === 'number') {
        return sum + converted
      }
      
      // If conversion is still loading, don't add to sum
      if (isLoadingConverted.value || isFetchingConverted.value) {
        return sum
      }
      
      console.warn(`[useSavings] No converted amount for saving ${saving.id} (${saving.currency})`)
      return sum
    }, 0)
  })

  return {
    savings,
    isLoading,
    isFetching,
    isError,
    error,
    totalAmount,
    totalAmountWithInterest,
    isDataLoaded,
    convertedAmounts,
    isLoadingConverted,
    isFetchingConverted,
  }
}

