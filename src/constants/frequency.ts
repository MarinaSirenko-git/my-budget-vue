export type FrequencyCode = 'monthly' | 'annual'

export interface FrequencyOption {
  label: string
  value: FrequencyCode
}

const frequencyLabelsMap: Record<FrequencyCode, { en: string; ru: string }> = {
  monthly: { en: 'Monthly', ru: 'Ежемесячно' },
  annual: { en: 'Annual', ru: 'Ежегодно' },
}

/**
 * Get frequency options with labels based on current language
 */
export const getFrequencyOptions = (locale: 'en' | 'ru' = 'ru'): FrequencyOption[] => {
  return (Object.keys(frequencyLabelsMap) as FrequencyCode[]).map((value) => ({
    value,
    label: frequencyLabelsMap[value][locale],
  }))
}
