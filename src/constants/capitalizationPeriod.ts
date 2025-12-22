export type CapitalizationPeriodCode = 'monthly' | 'quarterly' | 'annual'

export interface CapitalizationPeriodOption {
  label: string
  value: CapitalizationPeriodCode
}

const capitalizationPeriodLabelsMap: Record<CapitalizationPeriodCode, { en: string; ru: string }> = {
  monthly: { en: 'Monthly', ru: 'Ежемесячно' },
  quarterly: { en: 'Quarterly', ru: 'Ежеквартально' },
  annual: { en: 'Annual', ru: 'Ежегодно' },
}

/**
 * Get capitalization period options with labels based on current language
 */
export const getCapitalizationPeriodOptions = (locale: 'en' | 'ru' = 'ru'): CapitalizationPeriodOption[] => {
  return (Object.keys(capitalizationPeriodLabelsMap) as CapitalizationPeriodCode[]).map((value) => ({
    value,
    label: capitalizationPeriodLabelsMap[value][locale],
  }))
}




