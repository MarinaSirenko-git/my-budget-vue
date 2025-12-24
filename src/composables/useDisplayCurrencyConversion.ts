import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { useCurrentUser } from './useCurrentUser'
import { useAmounts } from './useAmounts'
import type { CurrencyCode } from '@/constants/currency'
import { queryKeys } from '@/lib/queryKeys'

/**
 * Composable for currency conversion to display currency
 * Used for converting amounts to a selected display currency (different from scenario base currency)
 * This conversion is independent and doesn't affect scenario settings or summary calculations
 */
export const useDisplayCurrencyConversion = <T extends { id: string; amount: number; currency: string }>(
  items: MaybeRefOrGetter<T[] | undefined>,
  displayCurrency: MaybeRefOrGetter<CurrencyCode | null | undefined>,
  queryKeyPrefix: 'incomes' | 'expenses' | 'goals' | 'savings'
) => {
  const { userId } = useCurrentUser()
  const { convertAmountsBulk } = useAmounts()

  const queryKey = computed(() => {
    const currentItems = toValue(items)
    const currency = toValue(displayCurrency) ?? null
    const scenarioId = null // Not using scenarioId for display conversion to keep it independent
    
    const baseKey = queryKeyPrefix === 'incomes' 
      ? queryKeys.incomes.converted(userId.value, scenarioId, currency)
      : queryKeyPrefix === 'expenses'
      ? queryKeys.expenses.converted(userId.value, scenarioId, currency)
      : queryKeyPrefix === 'goals'
      ? queryKeys.goals.converted(userId.value, scenarioId, currency)
      : ['savings', 'converted', userId.value, scenarioId, currency] as const
    
    return [
      ...baseKey,
      'display', // Separate key prefix to distinguish from scenario-based conversion
      currentItems?.length ?? 0,
    ]
  })

  const enabled = computed(() => {
    const currentItems = toValue(items)
    const currency = toValue(displayCurrency)
    return (
      !!userId.value &&
      !!currency &&
      !!currentItems &&
      currentItems.length > 0
    )
  })

  const {
    data: convertedAmounts,
    isLoading,
    isFetching,
  } = useQuery<Record<string, number>>({
    queryKey,
    queryFn: async () => {
      const currentItems = toValue(items)
      const targetCurrency = toValue(displayCurrency)

      if (!currentItems || !targetCurrency) {
        return {}
      }

      // Filter items that need conversion (currency differs from target currency)
      const itemsToConvert = currentItems.filter(
        (item) =>
          item.currency !== targetCurrency &&
          typeof item.amount === 'number' &&
          item.amount != null &&
          typeof item.currency === 'string' &&
          item.currency != null
      )

      // If no items need conversion, return empty map
      if (itemsToConvert.length === 0) {
        return {}
      }

      // Prepare items for bulk conversion
      const conversionItems = itemsToConvert.map((item) => ({
        amount: item.amount as number,
        currency: item.currency as string,
      }))

      // Call bulk conversion
      const convertedData = await convertAmountsBulk(conversionItems, targetCurrency)

      if (!convertedData || !Array.isArray(convertedData)) {
        console.warn(`[useDisplayCurrencyConversion] No converted data returned for ${queryKeyPrefix}`)
        return {}
      }

      // Create map: item id -> converted amount (rounded to integer)
      const convertedMap: Record<string, number> = {}
      itemsToConvert.forEach((item, index) => {
        const convertedItem = convertedData[index]
        if (convertedItem && typeof convertedItem === 'object' && 'converted_amount' in convertedItem) {
          const convertedAmount = convertedItem.converted_amount as number
          convertedMap[item.id] = Math.round(convertedAmount)
        }
      })

      return convertedMap
    },
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })

  return {
    convertedAmounts,
    isLoading,
    isFetching,
  }
}