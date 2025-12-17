export type LanguageCode = 'en' | 'ru'

export interface LanguageOption {
  label: string
  value: LanguageCode
}

export const languageOptions: LanguageOption[] = [
  { label: 'English', value: 'en' },
  { label: 'Русский', value: 'ru' },
]


