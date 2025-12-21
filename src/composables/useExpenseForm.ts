import { computed, ref, watch, type MaybeRefOrGetter, toValue } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import { supabase } from './useSupabase'
import { currencyOptions, type CurrencyCode } from '@/constants/currency'
import { type FrequencyCode, type FrequencyOption } from '@/constants/frequency'
import { type ExpenseCategory } from '@/constants/financialCategories'

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

  // Modal state
  const showModal = ref(false)
  const selectedCategory = ref<ExpenseCategory | null>(null)
  const isSaving = ref(false)
  const saveError = ref<string | null>(null)
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
    saveError.value = null
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

  // Handle form submission
  const handleSubmit = async () => {
    if (!canSubmit.value) return

    const currentScenarioId = toValue(scenarioId)
    if (!currentScenarioId) {
      saveError.value = 'Scenario ID is required'
      return
    }

    isSaving.value = true
    saveError.value = null

    try {
      const expenseData = {
        amount: formData.value.amount,
        currency: formData.value.currency,
        type: formData.value.categoryName.trim(),
        frequency: formData.value.frequency || 'monthly',
      }

      if (editingExpenseId.value) {
        // Update existing expense
        const { error } = await supabase
          .from('expenses')
          .update(expenseData)
          .eq('id', editingExpenseId.value)

        if (error) {
          throw error
        }
      } else {
        // Insert new expense
        const { error } = await supabase
          .from('expenses')
          .insert({
            ...expenseData,
            scenario_id: currentScenarioId,
          })

        if (error) {
          throw error
        }
      }

      // Invalidate expenses query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['expenses'] })

      handleCloseModal()

      // Call success callback if provided
      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      console.error('Failed to save expense:', error)
      saveError.value = error instanceof Error ? error.message : 'Failed to save expense'
      // TODO: Show error message to user (e.g., using a toast notification)
    } finally {
      isSaving.value = false
    }
  }

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
