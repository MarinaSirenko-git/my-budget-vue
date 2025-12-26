<template>
  <div class="p-4 sm:p-6">
    <!-- Loading State -->
    <div v-if="isDataLoading" class="flex items-center justify-center min-h-[60vh]">
      <p>{{ t('loading') }}</p>
    </div>

    <!-- Goals List (if goals exist) -->
    <div v-else-if="goals && goals.length > 0" class="max-w-6xl mx-auto">
      <!-- Toolbar -->
      <div class="flex justify-end items-center gap-4 mb-4 sm:mb-2">
        <Button
          variant="primary"
          class="w-full sm:w-auto"
          @click="handleAddGoal"
        >
          {{ t('goal_form_submit') }}
        </Button>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <GoalCard
          v-for="goal in goals"
          :key="goal.id"
          :goal="goal"
          :locale-string="localeString"
          @edit="handleEdit"
          @delete="handleDelete"
        />
      </div>
    </div>

    <!-- Empty State (only when loading is complete and no data) -->
    <EmptyState
      v-else
      :emojis="['🐭', '🎯']"
      :title="t('goal_empty_title')"
      :subtitle="t('goal_empty_subtitle')"
      :action-button="{ label: t('goal_empty_add_first'), onClick: handleAddGoal }"
    />

    <!-- Add/Edit Goal Modal -->
    <GoalFormModal
      v-model="showModal"
      :form-data="formData"
      :is-saving="isSaving"
      :can-submit="canSubmit"
      :is-editing="!!editingGoalId"
      :goal-id="editingGoalId"
      :locale-string="localeString"
      :currency-options="currencyOptions"
      :min-date="minDate"
      @close="handleCloseModal"
      @submit="handleSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { useHeadMeta } from '@/composables/useHeadMeta'
import { computed, ref, watch } from 'vue'
import { useTranslation } from '@/i18n'
import { currencyOptions, type CurrencyCode } from '@/constants/currency'
import { useCurrentScenario } from '@/composables/useCurrentScenario'
import { useGoals, type Goal } from '@/composables/useGoals'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { supabase } from '@/composables/useSupabase'
import { queryKeys } from '@/lib/queryKeys'
import i18next from 'i18next'
import EmptyState from '@/components/EmptyState.vue'
import GoalFormModal, { type GoalFormData } from '@/components/goals/GoalFormModal.vue'
import GoalCard from '@/components/goals/GoalCard.vue'
import Button from '@/components/Button.vue'

const { t } = useTranslation()

// Set page metadata
useHeadMeta({
  title: () => t('page_title_goal'),
  description: () => t('page_description_goal')
})

const { scenario, isLoading: isLoadingScenario } = useCurrentScenario()
const { userId } = useCurrentUser()
const queryClient = useQueryClient()

// Use goals composable - передаем computed для реактивности
const scenarioId = computed(() => {
  const id = scenario.value?.id
  return id
})
const { goals, isLoading: isLoadingGoals, isFetching: isFetchingGoals } = useGoals(scenarioId)

const isDataLoading = computed(() => {
  const result = (() => {
    if (isLoadingScenario.value) return true
    if (scenario.value && goals.value === undefined) return true
    if (isLoadingGoals.value || isFetchingGoals.value) return true
    
    return false
  })()
  
  return result
})

// Mutation for creating/updating goals
const goalMutation = useMutation({
  mutationFn: async ({ 
    goalData, 
    goalId, 
    savingsAllocations 
  }: { 
    goalData: any
    goalId: string | null
    savingsAllocations: Array<{ savings_id: string; amount_used: number; currency: string }>
  }) => {
    if (!scenario.value?.id || !userId.value) {
      throw new Error('Scenario ID and User ID are required')
    }

    let savedGoal

    if (goalId) {
      // Update existing goal
      const { data, error } = await supabase
        .from('goals')
        .update(goalData)
        .eq('id', goalId)
        .select()
        .single()

      if (error) {
        throw error
      }
      savedGoal = data
    } else {
      // Create new goal
      const { data, error } = await supabase
        .from('goals')
        .insert({
          ...goalData,
          scenario_id: scenario.value.id,
          user_id: userId.value,
        })
        .select()
        .single()

      if (error) {
        throw error
      }
      savedGoal = data
    }

    // Handle savings allocations using UPSERT approach
    if (goalId) {
      // For UPDATE: use smart upsert + delete approach
      if (savingsAllocations && Array.isArray(savingsAllocations) && savingsAllocations.length > 0) {
        // Prepare allocations for upsert
        const allocationsToUpsert = savingsAllocations.map(allocation => ({
          goal_id: savedGoal.id,
          savings_id: allocation.savings_id,
          amount_used: allocation.amount_used,
          currency: allocation.currency,
        }))

        // Upsert: update existing or insert new allocations
        const { error: upsertError } = await supabase
          .from('goal_savings_allocations')
          .upsert(allocationsToUpsert, {
            onConflict: 'goal_id,savings_id' // Use unique constraint
          })

        if (upsertError) {
          throw upsertError
        }

        // Delete allocations that are no longer in the new data
        const { data: existingAllocations, error: fetchError } = await supabase
          .from('goal_savings_allocations')
          .select('savings_id')
          .eq('goal_id', savedGoal.id)

        if (fetchError) {
          throw fetchError
        }

        const existingSavingsIds = new Set(existingAllocations?.map(a => a.savings_id) || [])
        const newSavingsIds = new Set(savingsAllocations.map(a => a.savings_id))

        // Find allocations to delete (exist in DB but not in new data)
        const toDelete = Array.from(existingSavingsIds).filter(id => !newSavingsIds.has(id))
        
        if (toDelete.length > 0) {
          const { error: deleteError } = await supabase
            .from('goal_savings_allocations')
            .delete()
            .eq('goal_id', savedGoal.id)
            .in('savings_id', toDelete)

          if (deleteError) {
            throw deleteError
          }
        }
      } else {
        // If no allocations provided, delete all existing ones
        const { error: deleteError } = await supabase
          .from('goal_savings_allocations')
          .delete()
          .eq('goal_id', savedGoal.id)

        if (deleteError) {
          throw deleteError
        }
      }
    } else {
      // For INSERT: just insert new allocations if any
      if (savingsAllocations && Array.isArray(savingsAllocations) && savingsAllocations.length > 0) {
        const allocationsToInsert = savingsAllocations.map(allocation => ({
          goal_id: savedGoal.id,
          savings_id: allocation.savings_id,
          amount_used: allocation.amount_used,
          currency: allocation.currency,
        }))

        const { error: insertError } = await supabase
          .from('goal_savings_allocations')
          .insert(allocationsToInsert)

        if (insertError) {
          throw insertError
        }
      }
    }

    return savedGoal
  },
  onMutate: async (variables) => {
    const currentUserId = userId.value
    const currentScenarioId = scenario.value?.id
    if (!currentUserId || !currentScenarioId) return

    const queryKey = queryKeys.goals.list(currentUserId, currentScenarioId)
    
    // Cancel any outgoing refetches
    await queryClient.cancelQueries({ queryKey })

    // Snapshot the previous value
    const previousGoals = queryClient.getQueryData<Goal[]>(queryKey)

    if (variables.goalId) {
      // Optimistically update existing goal
      queryClient.setQueryData<Goal[]>(queryKey, (old) => {
        if (!old) return old
        return old.map((goal) =>
          goal.id === variables.goalId
            ? { ...goal, ...variables.goalData }
            : goal
        )
      })
    } else {
      // Optimistically add new goal
      const optimisticGoal: Goal = {
        id: `temp-${Date.now()}`,
        created_at: new Date().toISOString(),
        user_id: currentUserId,
        scenario_id: currentScenarioId,
        ...variables.goalData,
      }
      queryClient.setQueryData<Goal[]>(queryKey, (old) => {
        return old ? [optimisticGoal, ...old] : [optimisticGoal]
      })
    }

    return { previousGoals }
  },
  onError: (error, _variables, context) => {
    const currentUserId = userId.value
    const currentScenarioId = scenario.value?.id
    if (!currentUserId || !currentScenarioId || !context?.previousGoals) return

    // Rollback to previous value on error
    const queryKey = queryKeys.goals.list(currentUserId, currentScenarioId)
    queryClient.setQueryData(queryKey, context.previousGoals)
    
    console.error('Failed to save goal:', error)
  },
  onSuccess: (data, _variables) => {
    const currentUserId = userId.value
    const currentScenarioId = scenario.value?.id
    if (!currentUserId || !currentScenarioId) return

    const queryKey = queryKeys.goals.list(currentUserId, currentScenarioId)
    
    // Update with real data from server
    queryClient.setQueryData<Goal[]>(queryKey, (old) => {
      if (!old) return [data]
      
      if (editingGoalId.value) {
        // Update existing goal
        return old.map((goal) => (goal.id === editingGoalId.value ? data : goal))
      } else {
        // Replace first optimistic goal (temp ID) with real one
        const tempIndex = old.findIndex((g) => g.id.startsWith('temp-'))
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
    queryClient.invalidateQueries({ queryKey: queryKeys.goals.all })
    // Invalidate allocations cache to reflect changes
    queryClient.invalidateQueries({ 
      queryKey: queryKeys.goals.allocations(currentUserId, currentScenarioId)
    })
    // Refetch allocations for active queries (e.g., if modal is open)
    queryClient.refetchQueries({ 
      queryKey: queryKeys.goals.allocations(currentUserId, currentScenarioId),
      type: 'active'  // Only refetch if query is currently active (modal is open)
    })
    // Refetch converted amounts immediately to update the UI
    queryClient.refetchQueries({ 
      queryKey: queryKeys.goals.converted(currentUserId, currentScenarioId, null),
      type: 'active'
    })

    handleCloseModal()
  },
})

const isSaving = computed(() => goalMutation.isPending.value)

// Get current locale from i18next
const currentLocale = computed<'en' | 'ru'>(() => {
  const lang = i18next.language || i18next.languages?.[0] || 'en'
  return lang.startsWith('ru') ? 'ru' : 'en'
})

// Get locale string for currency input
const localeString = computed(() => {
  return currentLocale.value === 'ru' ? 'ru-RU' : 'en-US'
})

// Get minimum date (today) for date input
const minDate = computed(() => {
  const today = new Date()
  return today.toISOString().split('T')[0]
})

// Modal state
const showModal = ref(false)
const editingGoalId = ref<string | null>(null)

// Form data
const formData = ref<GoalFormData>({
  name: '',
  targetAmount: null,
  currency: null,
  targetDate: null,
  useSavings: false,
  selectedSavings: [],
})

// Reset form when modal closes
watch(showModal, (isOpen) => {
  if (!isOpen) {
    formData.value = {
      name: '',
      targetAmount: null,
      currency: null,
      targetDate: null,
      useSavings: false,
      selectedSavings: [],
    }
    editingGoalId.value = null
  } else {
    // Set default currency from scenario when modal opens, if not already set
    if (!formData.value.currency && scenario.value?.base_currency) {
      const scenarioCurrency = scenario.value.base_currency as CurrencyCode
      if (currencyOptions.some(opt => opt.value === scenarioCurrency)) {
        formData.value.currency = scenarioCurrency
      }
    }
  }
})

const canSubmit = computed(() => {
  return (
    formData.value.name.trim() !== '' &&
    formData.value.targetAmount !== null &&
    formData.value.targetAmount > 0 &&
    formData.value.currency !== null &&
    formData.value.targetDate !== null &&
    formData.value.targetDate !== ''
  )
})

const handleAddGoal = () => {
  // Set default currency from scenario base_currency, or first option if available
  if (!formData.value.currency) {
    const scenarioCurrency = scenario.value?.base_currency as CurrencyCode | null | undefined
    if (scenarioCurrency && currencyOptions.some(opt => opt.value === scenarioCurrency)) {
      formData.value.currency = scenarioCurrency
    } else if (currencyOptions.length > 0) {
      formData.value.currency = currencyOptions[0].value
    }
  }
  showModal.value = true
}

const handleCloseModal = () => {
  showModal.value = false
}

const handleSubmit = async () => {
  if (!canSubmit.value) return

  if (!scenario.value?.id || !userId.value) {
    return
  }

  // Prepare goal data without selected_savings
  const goalData: any = {
    name: formData.value.name.trim(),
    target_amount: formData.value.targetAmount!,
    target_date: formData.value.targetDate!,
    currency: formData.value.currency!,
    use_savings: formData.value.useSavings,
    // selected_savings removed - will be saved to goal_savings_allocations table
  }

  // Only set current_amount to 0 for new goals
  if (!editingGoalId.value) {
    goalData.current_amount = 0
  }

  // Prepare savings allocations
  // Only save allocations if useSavings is true AND there are valid savings selected
  const savingsAllocations = formData.value.useSavings && 
                             formData.value.selectedSavings && 
                             Array.isArray(formData.value.selectedSavings) &&
                             formData.value.selectedSavings.length > 0
    ? formData.value.selectedSavings
        .filter(s => s && s.savingsId && s.amount !== null && s.amount > 0)
        .map(s => ({
          savings_id: s.savingsId!,
          amount_used: s.amount!,
          currency: formData.value.currency!, // Use goal currency for allocation
        }))
    : []

  goalMutation.mutate({
    goalData,
    goalId: editingGoalId.value,
    savingsAllocations,
  })
}

// Handle edit goal
const handleEdit = async (goal: Goal) => {
  editingGoalId.value = goal.id
  
  // Load goal with allocations using RPC function (one query instead of two)
  const { data, error } = await supabase.rpc('get_goal_with_allocations', {
    goal_id_param: goal.id
  })

  if (error) {
    console.error('Failed to load goal with allocations:', error)
    // Fallback to basic goal data from cache
    formData.value = {
      name: goal.name,
      targetAmount: goal.target_amount,
      currency: goal.currency as CurrencyCode,
      targetDate: goal.target_date || null,
      useSavings: (goal as any).use_savings || false,
      selectedSavings: [],
    }
    showModal.value = true
    return
  }

  const goalData = data?.goal || goal
  const allocations = data?.allocations || []

  formData.value = {
    name: goalData.name,
    targetAmount: goalData.target_amount,
    currency: goalData.currency as CurrencyCode,
    targetDate: goalData.target_date || null,
    useSavings: goalData.use_savings || false,
    selectedSavings: Array.isArray(allocations) && allocations.length > 0
      ? allocations.map((a: any) => ({
          savingsId: a.savings_id || null,
          amount: a.amount_used || null,
        }))
      : [],
  }
  showModal.value = true
}

// Mutation for deleting goals
const deleteGoalMutation = useMutation({
  mutationFn: async (goalId: string) => {
    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', goalId)

    if (error) {
      throw error
    }
    return goalId
  },
  onMutate: async (goalId) => {
    const currentUserId = userId.value
    const currentScenarioId = scenario.value?.id
    if (!currentUserId || !currentScenarioId) return

    const queryKey = queryKeys.goals.list(currentUserId, currentScenarioId)
    
    // Cancel any outgoing refetches
    await queryClient.cancelQueries({ queryKey })

    // Snapshot the previous value
    const previousGoals = queryClient.getQueryData<Goal[]>(queryKey)

    // Optimistically remove goal
    queryClient.setQueryData<Goal[]>(queryKey, (old) => {
      return old ? old.filter((goal) => goal.id !== goalId) : []
    })

    return { previousGoals }
  },
  onError: (error, _goalId, context) => {
    const currentUserId = userId.value
    const currentScenarioId = scenario.value?.id
    if (!currentUserId || !currentScenarioId || !context?.previousGoals) return

    // Rollback to previous value on error
    const queryKey = queryKeys.goals.list(currentUserId, currentScenarioId)
    queryClient.setQueryData(queryKey, context.previousGoals)
    
    console.error('Failed to delete goal:', error)
  },
  onSuccess: () => {
    const currentUserId = userId.value
    const currentScenarioId = scenario.value?.id
    if (!currentUserId || !currentScenarioId) return

    // Invalidate and refetch related queries for immediate update
    queryClient.invalidateQueries({ queryKey: queryKeys.goals.all })
    // Invalidate allocations cache when goal is deleted
    queryClient.invalidateQueries({ 
      queryKey: queryKeys.goals.allocations(currentUserId, currentScenarioId)
    })
    // Refetch allocations for active queries (e.g., if modal is open)
    queryClient.refetchQueries({ 
      queryKey: queryKeys.goals.allocations(currentUserId, currentScenarioId),
      type: 'active'  // Only refetch if query is currently active (modal is open)
    })
    queryClient.refetchQueries({ 
      queryKey: queryKeys.goals.converted(currentUserId, currentScenarioId, null),
      type: 'active'
    })
  },
})

// Handle delete goal
const handleDelete = async (goal: Goal) => {
  const confirmMessage = t('goal_delete_confirm', { name: goal.name }) || `Are you sure you want to delete "${goal.name}"?`
  const confirmed = window.confirm(confirmMessage)
  
  if (!confirmed) {
    return
  }

  deleteGoalMutation.mutate(goal.id)
}
</script>
