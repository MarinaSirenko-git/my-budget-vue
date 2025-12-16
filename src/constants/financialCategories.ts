export interface IncomeType {
  id: string
  value: string
  label: string
  isCustom: boolean
}

export interface ExpenseCategory {
  id: string
  value: string
  label: string
  isCustom: boolean
}

interface IncomeCategoryData {
  id: string
  value: string
  labels: { en: string; ru: string }
  isCustom: boolean
}

interface ExpenseCategoryData {
  id: string
  value: string
  labels: { en: string; ru: string }
  isCustom: boolean
}

export const INCOME_CATEGORIES: IncomeCategoryData[] = [
  {
    id: 'salary',
    value: 'salary',
    labels: { en: 'Salary', ru: 'Зарплата' },
    isCustom: false,
  },
  {
    id: 'bonuses',
    value: 'bonuses',
    labels: { en: 'Bonuses', ru: 'Бонусы' },
    isCustom: false,
  },
  {
    id: 'rental-income',
    value: 'rental-income',
    labels: { en: 'Rental Income', ru: 'Аренда' },
    isCustom: false,
  },
  {
    id: 'dividends',
    value: 'dividends',
    labels: { en: 'Dividends', ru: 'Дивиденды' },
    isCustom: false,
  },
  {
    id: 'digital-product-sales',
    value: 'digital-product-sales',
    labels: { en: 'Digital Product Sales', ru: 'Продажа цифровых продуктов' },
    isCustom: false,
  },
  {
    id: 'tax-refunds',
    value: 'tax-refunds',
    labels: { en: 'Tax Refunds', ru: 'Налоговые возвраты' },
    isCustom: false,
  },
  {
    id: 'government-benefits',
    value: 'government-benefits',
    labels: { en: 'Government Benefits', ru: 'Государственные пособия' },
    isCustom: false,
  },
  {
    id: 'custom',
    value: 'custom',
    labels: { en: 'Custom', ru: 'Прочее' },
    isCustom: true,
  },
]

export const EXPENSE_CATEGORIES: ExpenseCategoryData[] = [
  {
    id: 'kids-school-receipt',
    value: 'kids-school-receipt',
    labels: { en: 'Kids School', ru: 'Школа детей' },
    isCustom: false,
  },
  {
    id: 'food-household',
    value: 'food-household',
    labels: { en: 'Food & Household', ru: 'Еда и хозяйство' },
    isCustom: false,
  },
  {
    id: 'car',
    value: 'car',
    labels: { en: 'Car', ru: 'Автомобиль' },
    isCustom: false,
  },
  {
    id: 'personal-pocket-money',
    value: 'personal-pocket-money',
    labels: { en: 'Personal Pocket Money', ru: 'Личные карманные деньги' },
    isCustom: false,
  },
  {
    id: 'parties',
    value: 'parties',
    labels: { en: 'Parties', ru: 'Праздники' },
    isCustom: false,
  },
  {
    id: 'internet',
    value: 'internet',
    labels: { en: 'Internet', ru: 'Интернет' },
    isCustom: false,
  },
  {
    id: 'electricity',
    value: 'electricity',
    labels: { en: 'Electricity', ru: 'Электричество' },
    isCustom: false,
  },
  {
    id: 'water',
    value: 'water',
    labels: { en: 'Water', ru: 'Вода' },
    isCustom: false,
  },
  {
    id: 'kids-hobbies',
    value: 'kids-hobbies',
    labels: { en: 'Kids Hobbies', ru: 'Хобби детей' },
    isCustom: false,
  },
  {
    id: 'fix-repair',
    value: 'fix-repair',
    labels: { en: 'Fix & Repair', ru: 'Ремонт' },
    isCustom: false,
  },
  {
    id: 'credit',
    value: 'credit',
    labels: { en: 'Credit', ru: 'Кредит' },
    isCustom: false,
  },
  {
    id: 'custom',
    value: 'Custom',
    labels: { en: 'Custom', ru: 'Прочее' },
    isCustom: true,
  },
]

/**
 * Get income categories with labels based on current language
 */
export const getIncomeCategories = (locale: 'en' | 'ru' = 'ru'): IncomeType[] => {
  return INCOME_CATEGORIES.map((category) => ({
    id: category.id,
    value: category.value,
    label: category.labels[locale],
    isCustom: category.isCustom,
  }))
}

/**
 * Get expense categories with labels based on current language
 */
export const getExpenseCategories = (locale: 'en' | 'ru' = 'ru'): ExpenseCategory[] => {
  return EXPENSE_CATEGORIES.map((category) => ({
    id: category.id,
    value: category.value,
    label: category.labels[locale],
    isCustom: category.isCustom,
  }))
}

// Export category IDs for backward compatibility (if needed elsewhere)
export const INCOME_CATEGORY_IDS = INCOME_CATEGORIES.map(({ id, value, isCustom }) => ({
  id,
  value,
  isCustom,
}))

export const EXPENSE_CATEGORY_IDS = EXPENSE_CATEGORIES.map(({ id, value, isCustom }) => ({
  id,
  value,
  isCustom,
}))
