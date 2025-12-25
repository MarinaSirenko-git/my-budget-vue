import { computed, ref, watch, type MaybeRefOrGetter, toValue } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { supabase } from './useSupabase'
import { currencyOptions, type CurrencyCode } from '@/constants/currency'
import { useCurrentUser } from './useCurrentUser'
import { queryKeys } from '@/lib/queryKeys'
import type { Savings } from './useSavings'
import type { SavingsFormData } from '@/components/savings/SavingsFormModal.vue'

/**
 * Composable for managing savings form state, validation, and submission
 */
export const useSavingsForm = (
  scenarioId: MaybeRefOrGetter<string | null | undefined>,
  scenario: MaybeRefOrGetter<{ base_currency?: string | null } | null | undefined>,
  onSuccess?: () => void
) => {
  const queryClient = useQueryClient()
  const { userId } = useCurrentUser()

  // Modal state
  const showModal = ref(false)
  const editingSavingsId = ref<string | null>(null)

  // Form data
  const formData = ref<SavingsFormData>({
    name: '',
    amount: null,
    currency: null,
    earningInterest: false,
    interestRate: '',
    capitalizationPeriod: null,
    depositDate: null,
  })

  // Reset form to initial state
  const resetForm = () => {
    editingSavingsId.value = null
    formData.value = {
      name: '',
      amount: null,
      currency: null,
      earningInterest: false,
      interestRate: '',
      capitalizationPeriod: null,
      depositDate: null,
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
    const baseValid =
      formData.value.name.trim() !== '' &&
      formData.value.amount !== null &&
      formData.value.amount > 0 &&
      formData.value.currency !== null

    // If earning interest, validate interest fields
    if (formData.value.earningInterest) {
      const interestRateValue = parseFloat(formData.value.interestRate)
      const hasValidDate = formData.value.depositDate !== null && formData.value.depositDate.trim() !== ''
      
      // Validate date is not in future
      let isDateValid = true
      if (hasValidDate && formData.value.depositDate) {
        const depositDate = new Date(formData.value.depositDate)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        isDateValid = depositDate <= today
      }

      return (
        baseValid &&
        formData.value.interestRate.trim() !== '' &&
        !isNaN(interestRateValue) &&
        interestRateValue > 0 &&
        interestRateValue <= 100 &&
        formData.value.capitalizationPeriod !== null &&
        hasValidDate &&
        isDateValid
      )
    }

    return baseValid
  })

  // Handle modal close
  const handleCloseModal = () => {
    showModal.value = false
  }

  // Start editing a savings
  const startEdit = (saving: Savings) => {
    editingSavingsId.value = saving.id
    
    // Use deposit_date if available, otherwise use created_at as fallback
    let depositDate: string | null = null
    if (saving.deposit_date) {
      depositDate = saving.deposit_date.split('T')[0] // Extract date part from ISO string
    } else if (saving.created_at) {
      depositDate = saving.created_at.split('T')[0] // Extract date part from ISO string
    }
    
    formData.value = {
      name: saving.comment || '',
      amount: saving.amount,
      currency: saving.currency as CurrencyCode,
      earningInterest: saving.interest_rate !== null && saving.interest_rate !== undefined,
      interestRate: saving.interest_rate !== null ? String(saving.interest_rate) : '',
      capitalizationPeriod: saving.capitalization_period as any,
      depositDate,
    }
    showModal.value = true
  }

  // Mutation for creating/updating savings
  const savingsMutation = useMutation({
    mutationFn: async (variables: { savingsData: any; savingsId?: string | null }) => {
      const currentScenarioId = toValue(scenarioId)
      if (!currentScenarioId) {
        throw new Error('Scenario ID is required')
      }

      if (variables.savingsId) {
        // Update existing savings
        const { data, error } = await supabase
          .from('savings')
          .update(variables.savingsData)
          .eq('id', variables.savingsId)
          .select()
          .single()

        if (error) {
          throw error
        }
        return data
      } else {
        // Insert new savings
        const { data, error } = await supabase
          .from('savings')
          .insert({
            ...variables.savingsData,
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

      const queryKey = queryKeys.savings.list(currentUserId, currentScenarioId)
      
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey })

      // Snapshot the previous value
      const previousSavings = queryClient.getQueryData<Savings[]>(queryKey)

      // Optimistically update only for editing existing savings
      if (variables.savingsId) {
        // Update existing savings
        queryClient.setQueryData<Savings[]>(queryKey, (old) => {
          if (!old) return old
          return old.map((saving) =>
            saving.id === variables.savingsId
              ? { ...saving, ...variables.savingsData }
              : saving
          )
        })
      }

      return { previousSavings }
    },
    onError: (error, _variables, context) => {
      const currentUserId = userId.value
      const currentScenarioId = toValue(scenarioId)
      if (!currentUserId || !currentScenarioId || !context?.previousSavings) return

      // Rollback to previous value on error
      const queryKey = queryKeys.savings.list(currentUserId, currentScenarioId)
      queryClient.setQueryData(queryKey, context.previousSavings)
      
      console.error('Failed to save savings:', error)
    },
    onSuccess: () => {
      const currentUserId = userId.value
      const currentScenarioId = toValue(scenarioId)
      if (!currentUserId || !currentScenarioId) return

      // Invalidate queries to trigger refetch from 'savings_decrypted' view if available
      // This ensures we get properly decrypted data
      queryClient.invalidateQueries({ queryKey: queryKeys.savings.all })

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
    if (!currentScenarioId) return

    const savingsData: any = {
      amount: formData.value.amount!,
      currency: formData.value.currency!,
      comment: formData.value.name.trim(),
    }

    // Add interest fields only if earning interest
    if (formData.value.earningInterest) {
      savingsData.interest_rate = parseFloat(formData.value.interestRate)
      savingsData.capitalization_period = formData.value.capitalizationPeriod
      // Add deposit_date if provided, otherwise use current date
      savingsData.deposit_date = formData.value.depositDate || new Date().toISOString()
    } else {
      savingsData.interest_rate = null
      savingsData.capitalization_period = null
      savingsData.deposit_date = null
    }

    savingsMutation.mutate({
      savingsData,
      savingsId: editingSavingsId.value,
    })
  }

  const isSaving = computed(() => savingsMutation.isPending.value)
  const saveError = computed(() => {
    const error = savingsMutation.error.value
    return error instanceof Error ? error.message : error ? 'Failed to save savings' : null
  })

  return {
    // State
    formData,
    isSaving,
    saveError,
    showModal,
    editingSavingsId,
    // Computed
    canSubmit,
    // Methods
    handleCloseModal,
    handleSubmit,
    resetForm,
    startEdit,
  }
}

