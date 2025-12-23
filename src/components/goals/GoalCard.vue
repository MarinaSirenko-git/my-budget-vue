<template>
  <div class="p-4 border border-gray-200 rounded-lg relative">
    <!-- Header with title and monthly amount/months info -->
    <div class="flex items-center justify-between gap-2 mb-2 py-2">
      <h3 class="font-medium text-gray-900 leading-none">{{ goal.name }}</h3>
      <span v-if="monthlyAmount > 0 && monthsUntilTarget > 0" class="text-xs text-gray-500 leading-none">
        {{ formatCurrency(monthlyAmount, goal.currency) }}<span v-if="convertedMonthlyAmount && baseCurrency"> ({{ formatCurrency(convertedMonthlyAmount, baseCurrency) }})</span> / {{ monthsUntilTarget }} {{ t('goal_months_short') }}
      </span>
    </div>
    
    <!-- Main content -->
    <div>
      <p class="text-sm text-gray-600 mt-1">
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

// Calculate monthly payment based on creation date to target date
const monthlyPaymentFromCreation = computed(() => {
  if (totalMonthsFromCreation.value === 0) return 0
  
  const targetAmount = props.goal.target_amount
  const monthly = targetAmount / totalMonthsFromCreation.value
  
  // Round up to nearest cent to ensure goal is reached
  return Math.ceil(monthly * 100) / 100
})

// Calculate current amount based on months passed since creation
const calculatedCurrentAmount = computed(() => {
  if (!props.goal.target_date) {
    // If no target date, use actual current_amount
    return props.goal.current_amount || 0
  }
  
  const monthsPassed = monthsFromCreation.value
  const monthlyPayment = monthlyPaymentFromCreation.value
  
  // User makes first payment immediately when goal is created
  // So we count at least 1 payment even if 0 months have passed
  const paymentsMade = Math.max(1, monthsPassed + 1)
  
  // Calculate how much should have been saved by now
  const calculatedAmount = monthlyPayment * paymentsMade
  
  // Don't exceed target amount
  return Math.min(calculatedAmount, props.goal.target_amount)
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

