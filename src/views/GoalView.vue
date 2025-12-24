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
      :locale-string="localeString"
      :currency-options="currencyOptions"
      :min-date="minDate"
      @close="handleCloseModal"
      @submit="handleSubmit"
    />
  </div>
</template>

<script setup lang="ts">
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
  mutationFn: async ({ goalData, goalId }: { goalData: any; goalId: string | null }) => {
    if (!scenario.value?.id || !userId.value) {
      throw new Error('Scenario ID and User ID are required')
    }

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
      return data
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
      return data
    }
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
    // Refetch converted amounts immediately to update the UI
    queryClient.refetchQueries({ 
      queryKey: queryKeys.goals.converted(currentUserId, currentScenarioId, null),
      type: 'active'
    })

    handleCloseModal()
  },
})

const isSaving = computed(() => goalMutation.isPending.value)
// saveError is available for future error display in UI
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _saveError = computed(() => {
  const error = goalMutation.error.value
  return error instanceof Error ? error.message : error ? 'Failed to save goal' : null
})

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
})

// Reset form when modal closes
watch(showModal, (isOpen) => {
  if (!isOpen) {
    formData.value = {
      name: '',
      targetAmount: null,
      currency: null,
      targetDate: null,
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

  const goalData: any = {
    name: formData.value.name.trim(),
    target_amount: formData.value.targetAmount!,
    target_date: formData.value.targetDate!,
    currency: formData.value.currency!,
  }

  // Only set current_amount to 0 for new goals
  if (!editingGoalId.value) {
    goalData.current_amount = 0
  }

  goalMutation.mutate({
    goalData,
    goalId: editingGoalId.value,
  })
}

// Handle edit goal
const handleEdit = (goal: Goal) => {
  editingGoalId.value = goal.id
  formData.value = {
    name: goal.name,
    targetAmount: goal.target_amount,
    currency: goal.currency as CurrencyCode,
    targetDate: goal.target_date || null,
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
