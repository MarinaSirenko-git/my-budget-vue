import { computed, ref, watch, type MaybeRefOrGetter, toValue } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { supabase } from './useSupabase'
import { currencyOptions, type CurrencyCode } from '@/constants/currency'
import { type FrequencyCode, type FrequencyOption } from '@/constants/frequency'
import { type ExpenseCategory } from '@/constants/financialCategories'
import { useCurrentUser } from './useCurrentUser'
import { queryKeys } from '@/lib/queryKeys'
import type { Expense } from './useExpenses'

export interface ExpenseFormData {
  categoryName: string
  amount: number | null
  currency: CurrencyCode | null
  frequency: FrequencyCode | null
}

/**
 * Composable for managing expense form state, validation, and submission
 */
export const useExpenseForm = (
  scenarioId: MaybeRefOrGetter<string | null | undefined>,
  scenario: MaybeRefOrGetter<{ base_currency?: string | null } | null | undefined>,
  frequencyOptions: MaybeRefOrGetter<FrequencyOption[]>,
  onSuccess?: () => void
) => {
  const queryClient = useQueryClient()
  const { userId } = useCurrentUser()

  // Modal state
  const showModal = ref(false)
  const selectedCategory = ref<ExpenseCategory | null>(null)
  const editingExpenseId = ref<string | null>(null)

  // Form data
  const formData = ref<ExpenseFormData>({
    categoryName: '',
    amount: null,
    currency: null,
    frequency: null,
  })

  // Reset form to initial state
  const resetForm = () => {
    selectedCategory.value = null
    editingExpenseId.value = null
    formData.value = {
      categoryName: '',
      amount: null,
      currency: null,
      frequency: null,
    }
  }

  // Set default currency from scenario
  const setDefaultCurrency = () => {
    if (!formData.value.currency) {
      const currentScenario = toValue(scenario)
      const scenarioCurrency = currentScenario?.base_currency as CurrencyCode | null | undefined
      if (scenarioCurrency && currencyOptions.some(opt => opt.value === scenarioCurrency)) {
        formData.value.currency = scenarioCurrency
      } else if (currencyOptions.length > 0) {
        formData.value.currency = currencyOptions[0].value
      }
    }
  }

  // Set default frequency
  const setDefaultFrequency = () => {
    const currentFrequencyOptions = toValue(frequencyOptions)
    if (currentFrequencyOptions.length > 0 && !formData.value.frequency) {
      formData.value.frequency = 'monthly'
    }
  }

  // Reset form when modal closes
  watch(showModal, (isOpen) => {
    if (!isOpen) {
      resetForm()
    } else {
      // Set default currency from scenario when modal opens, if not already set
      setDefaultCurrency()
    }
  })

  // Validation
  const canSubmit = computed(() => {
    return (
      formData.value.categoryName.trim() !== '' &&
      formData.value.amount !== null &&
      formData.value.amount > 0 &&
      formData.value.currency !== null &&
      formData.value.frequency !== null
    )
  })

  // Handle option click (from EmptyState)
  const handleOptionClick = (option: ExpenseCategory) => {
    selectedCategory.value = option
    // Set category name from selected option, but leave empty if it's custom
    if (option.isCustom) {
      formData.value.categoryName = ''
    } else {
      formData.value.categoryName = option.label
    }
    // Set default currency from scenario base_currency, or first option if available
    setDefaultCurrency()
    // Set default frequency to monthly if available
    setDefaultFrequency()
    showModal.value = true
  }

  // Handle modal close
  const handleCloseModal = () => {
    showModal.value = false
  }

  // Start editing an expense
  const startEdit = (expense: { id: string; type: string; amount: number; currency: string; frequency: string }) => {
    editingExpenseId.value = expense.id
    formData.value = {
      categoryName: expense.type,
      amount: expense.amount,
      currency: expense.currency as CurrencyCode,
      frequency: expense.frequency as FrequencyCode,
    }
    // For edit mode, we don't need selectedCategory (it's only for new expenses)
    selectedCategory.value = null
    showModal.value = true
  }

  // Mutation for creating/updating expenses
  const expenseMutation = useMutation({
    mutationFn: async (variables: { expenseData: any; expenseId?: string | null }) => {
      const currentScenarioId = toValue(scenarioId)
      if (!currentScenarioId) {
        throw new Error('Scenario ID is required')
      }

      if (variables.expenseId) {
        // Update existing expense
        const { data, error } = await supabase
          .from('expenses')
          .update(variables.expenseData)
          .eq('id', variables.expenseId)
          .select()
          .single()

        if (error) {
          throw error
        }
        return data
      } else {
        // Insert new expense
        const { data, error } = await supabase
          .from('expenses')
          .insert({
            ...variables.expenseData,
            scenario_id: currentScenarioId,
          })
          .select()
          .single()

        if (error) {
          throw error
        }
        return data
      }
    },
    onMutate: async (variables) => {
      const currentUserId = userId.value
      const currentScenarioId = toValue(scenarioId)
      if (!currentUserId || !currentScenarioId) return

      const queryKey = queryKeys.expenses.list(currentUserId, currentScenarioId)
      
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey })

      // Snapshot the previous value
      const previousExpenses = queryClient.getQueryData<Expense[]>(queryKey)

      // Optimistically update to the new value
      if (variables.expenseId) {
        // Update existing expense
        queryClient.setQueryData<Expense[]>(queryKey, (old) => {
          if (!old) return old
          return old.map((expense) =>
            expense.id === variables.expenseId
              ? { ...expense, ...variables.expenseData }
              : expense
          )
        })
      } else {
        // Add new expense optimistically
        const optimisticExpense: Expense = {
          id: `temp-${Date.now()}`,
          created_at: new Date().toISOString(),
          user_id: currentUserId,
          scenario_id: currentScenarioId,
          ...variables.expenseData,
        }
        queryClient.setQueryData<Expense[]>(queryKey, (old) => {
          return old ? [optimisticExpense, ...old] : [optimisticExpense]
        })
      }

      return { previousExpenses }
    },
    onError: (error, variables, context) => {
      const currentUserId = userId.value
      const currentScenarioId = toValue(scenarioId)
      if (!currentUserId || !currentScenarioId || !context?.previousExpenses) return

      // Rollback to previous value on error
      const queryKey = queryKeys.expenses.list(currentUserId, currentScenarioId)
      queryClient.setQueryData(queryKey, context.previousExpenses)
      
      console.error('Failed to save expense:', error)
    },
    onSuccess: (data, variables) => {
      const currentUserId = userId.value
      const currentScenarioId = toValue(scenarioId)
      if (!currentUserId || !currentScenarioId) return

      const queryKey = queryKeys.expenses.list(currentUserId, currentScenarioId)
      
      // Update with real data from server
      queryClient.setQueryData<Expense[]>(queryKey, (old) => {
        if (!old) return [data]
        
        if (variables.expenseId) {
          // Update existing expense
          return old.map((expense) => (expense.id === data.id ? data : expense))
        } else {
          // Replace first optimistic expense (temp ID) with real one
          const tempIndex = old.findIndex((e) => e.id.startsWith('temp-'))
          if (tempIndex !== -1) {
            const newList = [...old]
            newList[tempIndex] = data
            return newList
          }
          // If no temp found, just add the new one
          return [data, ...old]
        }
      })

      // Invalidate and refetch related queries for immediate update
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all })
      // Refetch converted amounts immediately to update the UI
      queryClient.refetchQueries({ 
        queryKey: queryKeys.expenses.converted(currentUserId, currentScenarioId, null),
        type: 'active'
      })

      handleCloseModal()

      // Call success callback if provided
      if (onSuccess) {
        onSuccess()
      }
    },
  })

  // Handle form submission
  const handleSubmit = async () => {
    if (!canSubmit.value) return

    const currentScenarioId = toValue(scenarioId)
    if (!currentScenarioId) {
      return
    }

    const expenseData = {
      amount: formData.value.amount!,
      currency: formData.value.currency!,
      type: formData.value.categoryName.trim(),
      frequency: formData.value.frequency || 'monthly',
    }

    expenseMutation.mutate({
      expenseData,
      expenseId: editingExpenseId.value,
    })
  }

  const isSaving = computed(() => expenseMutation.isPending.value)
  const saveError = computed(() => {
    const error = expenseMutation.error.value
    return error instanceof Error ? error.message : error ? 'Failed to save expense' : null
  })

  return {
    // State
    formData,
    selectedCategory,
    isSaving,
    saveError,
    showModal,
    editingExpenseId,
    // Computed
    canSubmit,
    // Methods
    handleOptionClick,
    handleCloseModal,
    handleSubmit,
    resetForm,
    startEdit,
  }
}
