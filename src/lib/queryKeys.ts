/**
 * Centralized Query Key Factory
 * Provides type-safe, consistent query keys for Vue Query
 */

export const queryKeys = {
  expenses: {
    all: ['expenses'] as const,
    lists: () => [...queryKeys.expenses.all, 'list'] as const,
    list: (userId: string | null, scenarioId: string | null) =>
      [...queryKeys.expenses.lists(), userId, scenarioId] as const,
    converted: (userId: string | null, scenarioId: string | null, currency: string | null) =>
      [...queryKeys.expenses.all, 'converted', userId, scenarioId, currency] as const,
  },
  incomes: {
    all: ['incomes'] as const,
    lists: () => [...queryKeys.incomes.all, 'list'] as const,
    list: (userId: string | null, scenarioId: string | null) =>
      [...queryKeys.incomes.lists(), userId, scenarioId] as const,
    converted: (userId: string | null, scenarioId: string | null, currency: string | null) =>
      [...queryKeys.incomes.all, 'converted', userId, scenarioId, currency] as const,
  },
  goals: {
    all: ['goals'] as const,
    lists: () => [...queryKeys.goals.all, 'list'] as const,
    list: (userId: string | null, scenarioId: string | null) =>
      [...queryKeys.goals.lists(), userId, scenarioId] as const,
    converted: (userId: string | null, scenarioId: string | null, currency: string | null) =>
      [...queryKeys.goals.all, 'converted', userId, scenarioId, currency] as const,
  },
  scenarios: {
    all: ['scenarios'] as const,
    lists: () => [...queryKeys.scenarios.all, 'list'] as const,
    list: (userId: string | null) =>
      [...queryKeys.scenarios.lists(), userId] as const,
    detail: (slug: string, userId: string | null) =>
      [...queryKeys.scenarios.all, 'detail', slug, userId] as const,
  },
  summary: {
    all: ['summary'] as const,
    incomeTotal: (userId: string | null, scenarioId: string | null, currency: string | null) =>
      [...queryKeys.summary.all, 'income-total', userId, scenarioId, currency] as const,
    expenseTotal: (userId: string | null, scenarioId: string | null, currency: string | null) =>
      [...queryKeys.summary.all, 'expense-total', userId, scenarioId, currency] as const,
    goalTotal: (userId: string | null, scenarioId: string | null, currency: string | null) =>
      [...queryKeys.summary.all, 'goal-total', userId, scenarioId, currency] as const,
  },
  currentUser: {
    all: ['currentUser'] as const,
  },
}
