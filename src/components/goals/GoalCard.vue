<template>
  <div class="w-full p-4 border border-gray-200 rounded-lg relative bg-white">
    <!-- Header with title and monthly amount/months info -->
    <div class="flex items-center justify-between gap-2 mb-2">
      <h3 class="font-medium text-gray-900 leading-none">{{ goal.name }}</h3>
      <!-- Show achievement badge if goal is reached, otherwise show monthly payment -->
      <div v-if="isGoalAchieved" class="flex items-center gap-1.5 px-2 py-1 bg-gray-100 border border-gray-300 rounded-full">
        <span class="text-sm leading-none">🎉</span>
        <span class="text-xs font-medium text-gray-900 leading-none">{{ t('goal_achieved') }}</span>
      </div>
      <span v-else-if="monthlyAmount > 0 && monthsUntilTarget > 0" class="text-xs text-gray-500 leading-none py-1.5">
        {{ formatCurrency(monthlyAmount, goal.currency) }}<span v-if="convertedMonthlyAmount && baseCurrency"> ({{ formatCurrency(convertedMonthlyAmount, baseCurrency) }})</span> / {{ monthsUntilTarget }} {{ t('goal_months_short') }}
      </span>
    </div>
    
    <!-- Main content -->
    <div>
      <p class="text-sm text-gray-600">
        {{ formatCurrency(calculatedCurrentAmount, goal.currency) }} / {{ formatCurrency(goal.target_amount, goal.currency) }}
      </p>
      <!-- Progress Bar -->
      <div class="mt-2 mb-6 w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          class="h-full bg-black transition-all duration-300"
          :style="{ width: `${progressPercentage}%` }"
        ></div>
      </div>
      <p class="text-xs text-gray-500 mt-1">
        {{ t('goal_created_date_label') }}: {{ formatDate(goal.created_at) }}
      </p>
      <p v-if="goal.target_date" class="text-xs text-gray-500 mt-1">
        {{ t('goal_form_target_date_label') }}: {{ formatDate(goal.target_date) }}
      </p>
    </div>
    
    <!-- Action buttons in bottom right corner -->
    <div class="flex items-center gap-2 absolute bottom-4 right-4">
      <button
        type="button"
        class="p-1 hover:bg-gray-100 rounded transition"
        :aria-label="t('edit')"
        @click="$emit('edit', goal)"
      >
        <svg
          class="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </button>
      <button
        type="button"
        class="p-1 hover:bg-gray-100 rounded transition"
        :aria-label="t('delete')"
        @click="$emit('delete', goal)"
      >
        <svg
          class="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { useTranslation } from '@/i18n'
import { useCurrentScenario } from '@/composables/useCurrentScenario'
import { useAmounts } from '@/composables/useAmounts'
import { useGoalSavingsAllocations } from '@/composables/useGoalSavingsAllocations'
import type { Goal } from '@/composables/useGoals'
import type { CurrencyCode } from '@/constants/currency'

interface Props {
  goal: Goal
  localeString: string
}

const props = defineProps<Props>()
const { t } = useTranslation()
const { scenario } = useCurrentScenario()
const { convertAmountsBulk } = useAmounts()

// Load allocations to account for them in monthly payment calculation
const scenarioId = computed(() => scenario.value?.id ?? null)
const { allocations: allAllocations } = useGoalSavingsAllocations(scenarioId)

defineEmits<{
  edit: [goal: Goal]
  delete: [goal: Goal]
}>()

// Get base currency
const baseCurrency = computed<CurrencyCode | null>(() => {
  return (scenario.value?.base_currency as CurrencyCode) || null
})

// Calculate months from creation to target date
const totalMonthsFromCreation = computed(() => {
  if (!props.goal.target_date) return 0
  
  const createdDate = new Date(props.goal.created_at)
  const targetDate = new Date(props.goal.target_date)
  
  // Set to start of day for accurate calculation
  createdDate.setHours(0, 0, 0, 0)
  targetDate.setHours(0, 0, 0, 0)
  
  // Calculate difference in months
  const yearsDiff = targetDate.getFullYear() - createdDate.getFullYear()
  const monthsDiff = targetDate.getMonth() - createdDate.getMonth()
  const totalMonths = yearsDiff * 12 + monthsDiff
  
  return Math.max(1, totalMonths) // At least 1 month
})

// Calculate months from creation to today
const monthsFromCreation = computed(() => {
  const createdDate = new Date(props.goal.created_at)
  const today = new Date()
  
  // Set to start of day for accurate calculation
  createdDate.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  
  // Calculate difference in months
  const yearsDiff = today.getFullYear() - createdDate.getFullYear()
  const monthsDiff = today.getMonth() - createdDate.getMonth()
  const totalMonths = yearsDiff * 12 + monthsDiff
  
  return Math.max(0, totalMonths)
})

// Calculate months until target date (from today)
const monthsUntilTarget = computed(() => {
  if (!props.goal.target_date) return 0
  
  const targetDate = new Date(props.goal.target_date)
  const today = new Date()
  
  // Set to start of day for accurate calculation
  today.setHours(0, 0, 0, 0)
  targetDate.setHours(0, 0, 0, 0)
  
  // Calculate difference in months
  const yearsDiff = targetDate.getFullYear() - today.getFullYear()
  const monthsDiff = targetDate.getMonth() - today.getMonth()
  const totalMonths = yearsDiff * 12 + monthsDiff
  
  // If target date is in the past, return 0
  if (totalMonths < 0) return 0
  
  return totalMonths
})

/**
 * Get total allocations amount for this goal (in goal currency)
 * Allocations are stored in goal currency, so we can sum them directly
 */
const goalAllocationsTotal = computed(() => {
  if (!allAllocations.value || allAllocations.value.length === 0) {
    return 0
  }

  // Sum all allocations for this goal in the same currency as the goal
  // Note: allocations.currency is the goal currency (set when saving)
  return allAllocations.value
    .filter(a => a.goal_id === props.goal.id && a.currency === props.goal.currency)
    .reduce((sum, a) => sum + a.amount_used, 0)
})

// Calculate monthly payment based on creation date to target date
// Takes into account savings allocations - reduces target amount by allocations
const monthlyPaymentFromCreation = computed(() => {
  if (totalMonthsFromCreation.value === 0) return 0
  
  const targetAmount = props.goal.target_amount
  const allocationsTotal = goalAllocationsTotal.value
  
  // Calculate remaining amount to save (target - allocations)
  const remainingAmount = Math.max(0, targetAmount - allocationsTotal)
  
  const monthly = remainingAmount / totalMonthsFromCreation.value
  
  // Round up to nearest cent to ensure goal is reached
  return Math.ceil(monthly * 100) / 100
})

// Calculate current amount based on months passed since creation
// Includes both monthly payments and savings allocations
const calculatedCurrentAmount = computed(() => {
  if (!props.goal.target_date) {
    // If no target date, use actual current_amount + allocations
    const baseAmount = props.goal.current_amount || 0
    return baseAmount + goalAllocationsTotal.value
  }
  
  const monthsPassed = monthsFromCreation.value
  const monthlyPayment = monthlyPaymentFromCreation.value
  
  // Count payments only if at least 1 month has passed
  // First payment is made after the first month
  const paymentsMade = monthsPassed >= 1 ? monthsPassed : 0
  
  // Calculate how much should have been saved by now through monthly payments
  const calculatedAmount = monthlyPayment * paymentsMade
  
  // Add allocations (already saved from savings)
  const totalAmount = calculatedAmount + goalAllocationsTotal.value
  
  // Don't exceed target amount
  return Math.min(totalAmount, props.goal.target_amount)
})

// Calculate monthly amount needed to reach goal
// Use the same monthly payment that was calculated from creation date
const monthlyAmount = computed(() => {
  if (!props.goal.target_date) return 0
  
  // Use the monthly payment calculated from creation to target date
  // This ensures consistency - user pays the same amount every month
  return monthlyPaymentFromCreation.value
})

// Check if conversion is needed
const needsConversion = computed(() => {
  return baseCurrency.value && 
         props.goal.currency !== baseCurrency.value && 
         monthlyAmount.value > 0
})

// Convert monthly amount to base currency
const convertedMonthlyAmountQuery = useQuery({
  queryKey: computed(() => [
    'goal-monthly-amount-conversion',
    props.goal.id,
    monthlyAmount.value,
    props.goal.currency,
    baseCurrency.value,
  ]),
  queryFn: async () => {
    if (!needsConversion.value || !baseCurrency.value) {
      return null
    }

    const convertedData = await convertAmountsBulk(
      [{ amount: monthlyAmount.value, currency: props.goal.currency }],
      baseCurrency.value
    )

    if (!convertedData || !Array.isArray(convertedData) || convertedData.length === 0) {
      return null
    }

    const convertedItem = convertedData[0]
    if (convertedItem && typeof convertedItem === 'object' && 'converted_amount' in convertedItem) {
      return convertedItem.converted_amount as number
    }

    return null
  },
  enabled: computed(() => !!needsConversion.value),
  staleTime: 2 * 60 * 1000, // 2 minutes
  gcTime: 10 * 60 * 1000, // 10 minutes
})

const convertedMonthlyAmount = computed(() => {
  return convertedMonthlyAmountQuery.data.value
})

// Check if goal is achieved
const isGoalAchieved = computed(() => {
  return calculatedCurrentAmount.value >= props.goal.target_amount
})

// Calculate progress percentage
const progressPercentage = computed(() => {
  const current = calculatedCurrentAmount.value
  const target = props.goal.target_amount
  
  if (target === 0) return 0
  
  const percentage = (current / target) * 100
  return Math.min(100, Math.max(0, percentage))
})


// Format currency using Intl.NumberFormat
const formatCurrency = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat(props.localeString, {
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
    return new Intl.DateTimeFormat(props.localeString, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date)
  } catch (error) {
    return dateString
  }
}
</script>

