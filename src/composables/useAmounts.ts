import type { CurrencyCode } from '@/constants/currency'
import { currencySymbols } from '@/constants/currency'
import { useCurrentScenario } from './useCurrentScenario'
import { supabase } from './useSupabase'

/**
 * Composable for amount operations and currency conversion
 * Handles all operations related to sums and currency conversion
 */
export const useAmounts = () => {
  const { scenario } = useCurrentScenario()

  const getCurrencySymbol = (currency: CurrencyCode): string => {
    return currencySymbols[currency] || ''
  }


  const formatCurrency = (amount: number, currency?: CurrencyCode): string => {
    const targetCurrency: CurrencyCode = 
      currency || (scenario.value?.base_currency as CurrencyCode) || ''

    const symbol = getCurrencySymbol(targetCurrency)
    return `${amount.toFixed(2)} ${symbol}`
  }

  const convertAmountsBulk = async (
    items: { amount: number; currency: string }[],
    targetCurrency: CurrencyCode
  ) => {
    if (!targetCurrency || items.length === 0) {
      return null
    }

    try {
      const { data, error } = await supabase.rpc('convert_amount_bulk', {
        p_items: items,
        p_to_currency: targetCurrency,
      })

      if (error) {
        console.error('Currency conversion error:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Currency conversion error:', error)
      return null
    }
  }

  return {
    getCurrencySymbol,
    formatCurrency,
    convertAmountsBulk,
  }
}
