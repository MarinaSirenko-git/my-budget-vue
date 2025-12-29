import type { CapitalizationPeriodCode } from '@/constants/capitalizationPeriod'

export interface CompoundInterestParams {
  principal: number // Начальная сумма
  annualRate: number // Годовая процентная ставка в процентах (например, 5 для 5%)
  capitalizationPeriod: CapitalizationPeriodCode // Период капитализации
  timeInYears: number // Время в годах
}

/**
 * Возвращает количество капитализаций в год
 */
function getCapitalizationsPerYear(period: CapitalizationPeriodCode): number {
  switch (period) {
    case 'monthly':
      return 12
    case 'quarterly':
      return 4
    case 'annual':
      return 1
    default:
      return 1
  }
}

/**
 * Рассчитывает итоговую сумму с учетом сложных процентов
 * Формула: A = P(1 + r/n)^(nt)
 * 
 * @param params Параметры расчета
 * @returns Итоговая сумма (округленная до 2 знаков после запятой)
 */
export function calculateCompoundInterest({
  principal,
  annualRate,
  capitalizationPeriod,
  timeInYears,
}: CompoundInterestParams): number {
  if (timeInYears <= 0) {
    return principal
  }

  const r = annualRate / 100 // Преобразуем проценты в десятичное число
  const n = getCapitalizationsPerYear(capitalizationPeriod)
  const t = timeInYears

  const amount = principal * Math.pow(1 + r / n, n * t)
  return Math.round(amount * 100) / 100 // Округляем до копеек
}

/**
 * Рассчитывает только проценты (доход)
 * 
 * @param params Параметры расчета
 * @returns Сумма начисленных процентов (округленная до 2 знаков после запятой)
 */
export function calculateInterestEarned(params: CompoundInterestParams): number {
  const totalAmount = calculateCompoundInterest(params)
  const interest = totalAmount - params.principal
  return Math.round(interest * 100) / 100
}

/**
 * Рассчитывает проценты с указанной даты до текущей даты
 * 
 * @param principal Начальная сумма
 * @param annualRate Годовая процентная ставка в процентах
 * @param capitalizationPeriod Период капитализации
 * @param startDate Дата начала начисления процентов (ISO строка или Date)
 * @returns Сумма начисленных процентов
 */
export function calculateInterestSinceDate(
  principal: number,
  annualRate: number,
  capitalizationPeriod: CapitalizationPeriodCode,
  startDate: string | Date
): number {
  const now = new Date()
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate
  const timeInMs = now.getTime() - start.getTime()
  const timeInYears = timeInMs / (1000 * 60 * 60 * 24 * 365.25)

  if (timeInYears <= 0) {
    return 0
  }

  return calculateInterestEarned({
    principal,
    annualRate,
    capitalizationPeriod,
    timeInYears,
  })
}


