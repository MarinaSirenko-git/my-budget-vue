<template>
  <div class="p-6">
    <!-- Loading State -->
    <div v-if="isDataLoading" class="flex items-center justify-center min-h-[60vh]">
      <p>{{ t('loading') }}</p>
    </div>

    <!-- Goals List (if goals exist) -->
    <div v-else-if="goals && goals.length > 0" class="max-w-6xl mx-auto">
      <!-- Toolbar -->
      <div class="flex justify-end items-center gap-4 mb-2">
        <Button
          variant="primary"
          @click="handleAddGoal"
        >
          {{ t('goal_form_submit') }}
        </Button>
      </div>

      <!-- TODO: Add DataTable for goals when needed -->
      <div class="space-y-4">
        <div
          v-for="goal in goals"
          :key="goal.id"
          class="p-4 border border-gray-200 rounded-lg"
        >
          <div class="flex justify-between items-start">
            <div>
              <h3 class="font-medium text-gray-900">{{ goal.name }}</h3>
              <p class="text-sm text-gray-600 mt-1">
                {{ formatCurrency(goal.current_amount || 0, goal.currency) }} / {{ formatCurrency(goal.target_amount, goal.currency) }}
              </p>
              <p v-if="goal.target_date" class="text-xs text-gray-500 mt-1">
                {{ t('goal_form_target_date_label') }}: {{ formatDate(goal.target_date) }}
              </p>
            </div>
          </div>
        </div>
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

    <!-- Add Goal Modal -->
    <GoalFormModal
      v-model="showModal"
      :form-data="formData"
      :is-saving="isSaving"
      :can-submit="canSubmit"
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

// Mutation for creating goals
const goalMutation = useMutation({
  mutationFn: async (goalData: any) => {
    if (!scenario.value?.id || !userId.value) {
      throw new Error('Scenario ID and User ID are required')
    }

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

    // Optimistically add new goal
    const optimisticGoal: Goal = {
      id: `temp-${Date.now()}`,
      created_at: new Date().toISOString(),
      user_id: currentUserId,
      scenario_id: currentScenarioId,
      ...variables,
    }
    queryClient.setQueryData<Goal[]>(queryKey, (old) => {
      return old ? [optimisticGoal, ...old] : [optimisticGoal]
    })

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
      // Replace first optimistic goal (temp ID) with real one
      const tempIndex = old.findIndex((g) => g.id.startsWith('temp-'))
      if (tempIndex !== -1) {
        const newList = [...old]
        newList[tempIndex] = data
        return newList
      }
      // If no temp found, just add the new one
      return [data, ...old]
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

// Format currency using Intl.NumberFormat
const formatCurrency = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat(localeString.value, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch (error) {
    // Fallback if currency or locale is invalid
    return `${amount.toFixed(2)} ${currency}`
  }
}

// Format date
const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat(localeString.value, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date)
  } catch (error) {
    return dateString
  }
}

const handleSubmit = async () => {
  if (!canSubmit.value) return

  if (!scenario.value?.id || !userId.value) {
    return
  }

  const goalData = {
    name: formData.value.name.trim(),
    target_amount: formData.value.targetAmount!,
    current_amount: 0, // Start with 0, user can update later
    target_date: formData.value.targetDate!,
    currency: formData.value.currency!,
  }

  goalMutation.mutate(goalData)
}
</script>
