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
import { useGoals } from '@/composables/useGoals'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { useQueryClient } from '@tanstack/vue-query'
import { supabase } from '@/composables/useSupabase'
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

// Saving state
const isSaving = ref(false)
const saveError = ref<string | null>(null)

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

  if (!scenario.value?.id) {
    saveError.value = 'Scenario ID is required'
    return
  }

  if (!userId.value) {
    saveError.value = 'User ID is required'
    return
  }

  isSaving.value = true
  saveError.value = null

  try {
    const goalData = {
      name: formData.value.name.trim(),
      target_amount: formData.value.targetAmount,
      current_amount: 0, // Start with 0, user can update later
      target_date: formData.value.targetDate,
      currency: formData.value.currency,
      scenario_id: scenario.value.id,
      user_id: userId.value,
    }

    const { error } = await supabase
      .from('goals')
      .insert(goalData)

    if (error) {
      throw error
    }

    // Invalidate goals query to refresh the list
    queryClient.invalidateQueries({ queryKey: ['goals'] })

    handleCloseModal()
  } catch (error) {
    console.error('Failed to save goal:', error)
    saveError.value = error instanceof Error ? error.message : 'Failed to save goal'
    // TODO: Show error message to user (e.g., using a toast notification)
  } finally {
    isSaving.value = false
  }
}
</script>
