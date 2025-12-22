import { computed, ref, watch, type MaybeRefOrGetter, toValue } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { supabase } from './useSupabase'
import { currencyOptions, type CurrencyCode } from '@/constants/currency'
import { type FrequencyCode, type FrequencyOption } from '@/constants/frequency'
import { type IncomeType } from '@/constants/financialCategories'
import type { Income } from './useIncomes'
import { useCurrentUser } from './useCurrentUser'
import { queryKeys } from '@/lib/queryKeys'

export interface IncomeFormData {
  categoryName: string
  amount: number | null
  currency: CurrencyCode | null
  frequency: FrequencyCode | null
  paymentDay: string | null
}

/**
 * Composable for managing income form state, validation, and submission
 */
export const useIncomeForm = (
  scenarioId: MaybeRefOrGetter<string | null | undefined>,
  scenario: MaybeRefOrGetter<{ base_currency?: string | null } | null | undefined>,
  frequencyOptions: MaybeRefOrGetter<FrequencyOption[]>,
  onSuccess?: () => void
) => {
  const queryClient = useQueryClient()
  const { userId } = useCurrentUser()

  // Modal state
  const showModal = ref(false)
  const selectedCategory = ref<IncomeType | null>(null)
  const editingIncomeId = ref<string | null>(null)

  // Form data
  const formData = ref<IncomeFormData>({
    categoryName: '',
    amount: null,
    currency: null,
    frequency: null,
    paymentDay: null,
  })

  // Reset form to initial state
  const resetForm = () => {
    selectedCategory.value = null
    editingIncomeId.value = null
    formData.value = {
      categoryName: '',
      amount: null,
      currency: null,
      frequency: null,
      paymentDay: null,
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
      formData.value.frequency !== null &&
      formData.value.paymentDay !== null
    )
  })

  // Handle option click (from EmptyState)
  const handleOptionClick = (option: IncomeType) => {
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

  // Start editing an income
  const startEdit = (income: Income) => {
    editingIncomeId.value = income.id
    formData.value = {
      categoryName: income.type,
      amount: income.amount,
      currency: income.currency as CurrencyCode,
      frequency: income.frequency as FrequencyCode,
      paymentDay: income.payment_day,
    }
    // For edit mode, we don't need selectedCategory (it's only for new incomes)
    selectedCategory.value = null
    showModal.value = true
  }

  // Mutation for creating/updating incomes
  const incomeMutation = useMutation({
    mutationFn: async (variables: { incomeData: any; incomeId?: string | null }) => {
      const currentScenarioId = toValue(scenarioId)
      if (!currentScenarioId) {
        throw new Error('Scenario ID is required')
      }

      if (variables.incomeId) {
        // Update existing income
        const { data, error } = await supabase
          .from('incomes')
          .update(variables.incomeData)
          .eq('id', variables.incomeId)
          .select()
          .single()

        if (error) {
          throw error
        }
        return data
      } else {
        // Insert new income
        const { data, error } = await supabase
          .from('incomes')
          .insert({
            ...variables.incomeData,
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

      const queryKey = queryKeys.incomes.list(currentUserId, currentScenarioId)
      
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey })

      // Snapshot the previous value
      const previousIncomes = queryClient.getQueryData<Income[]>(queryKey)

      // Optimistically update to the new value
      if (variables.incomeId) {
        // Update existing income
        queryClient.setQueryData<Income[]>(queryKey, (old) => {
          if (!old) return old
          return old.map((income) =>
            income.id === variables.incomeId
              ? { ...income, ...variables.incomeData }
              : income
          )
        })
      } else {
        // Add new income optimistically
        const optimisticIncome: Income = {
          id: `temp-${Date.now()}`,
          created_at: new Date().toISOString(),
          user_id: currentUserId,
          scenario_id: currentScenarioId,
          ...variables.incomeData,
        }
        queryClient.setQueryData<Income[]>(queryKey, (old) => {
          return old ? [optimisticIncome, ...old] : [optimisticIncome]
        })
      }

      return { previousIncomes }
    },
    onError: (error, _variables, context) => {
      const currentUserId = userId.value
      const currentScenarioId = toValue(scenarioId)
      if (!currentUserId || !currentScenarioId || !context?.previousIncomes) return

      // Rollback to previous value on error
      const queryKey = queryKeys.incomes.list(currentUserId, currentScenarioId)
      queryClient.setQueryData(queryKey, context.previousIncomes)
      
      console.error('Failed to save income:', error)
    },
    onSuccess: (data, variables) => {
      const currentUserId = userId.value
      const currentScenarioId = toValue(scenarioId)
      if (!currentUserId || !currentScenarioId) return

      const queryKey = queryKeys.incomes.list(currentUserId, currentScenarioId)
      
      // Update with real data from server
      queryClient.setQueryData<Income[]>(queryKey, (old) => {
        if (!old) return [data]
        
        if (variables.incomeId) {
          // Update existing income
          return old.map((income) => (income.id === data.id ? data : income))
        } else {
          // Replace first optimistic income (temp ID) with real one
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
      queryClient.invalidateQueries({ queryKey: queryKeys.incomes.all })
      // Refetch converted amounts immediately to update the UI
      queryClient.refetchQueries({ 
        queryKey: queryKeys.incomes.converted(currentUserId, currentScenarioId, null),
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

    const incomeData = {
      amount: formData.value.amount!,
      currency: formData.value.currency!,
      type: formData.value.categoryName.trim(),
      frequency: formData.value.frequency || 'monthly',
      payment_day: formData.value.paymentDay!,
    }

    incomeMutation.mutate({
      incomeData,
      incomeId: editingIncomeId.value,
    })
  }

  const isSaving = computed(() => incomeMutation.isPending.value)
  const saveError = computed(() => {
    const error = incomeMutation.error.value
    return error instanceof Error ? error.message : error ? 'Failed to save income' : null
  })

  return {
    // State
    formData,
    selectedCategory,
    isSaving,
    saveError,
    showModal,
    editingIncomeId,
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
