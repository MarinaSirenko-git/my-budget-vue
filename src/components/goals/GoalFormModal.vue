<template>
  <FormModal
    v-model="showModal"
    :title="isEditing ? t('goal_form_edit_title') : t('goal_form_title')"
  >
    <template #body>
      <div class="space-y-4">
        <!-- Name -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">
            {{ t('goal_form_name_label') }}
          </label>
          <TextInput
            v-model="formData.name"
            :placeholder="t('goal_form_name_label')"
            :required="true"
          />
        </div>

        <!-- Target Amount -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">
            {{ t('goal_form_amount_label') }}
          </label>
          <CurrencyInput
            v-model="formData.targetAmount"
            :placeholder="t('goal_form_amount_label')"
            :required="true"
            :currency="formData.currency || undefined"
            :locale="localeString"
            :min="0.01"
          />
        </div>

        <!-- Currency -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">
            {{ t('goal_form_currency_label') }}
          </label>
          <SelectInput
            v-model="formData.currency"
            :options="currencyOptions"
            :placeholder="t('select_currency_placeholder')"
            :searchable="true"
          />
        </div>

        <!-- Target Date -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">
            {{ t('goal_form_target_date_label') }}
          </label>
          <input
            v-model="formData.targetDate"
            type="date"
            :min="minDate"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
            :required="true"
          />
        </div>

        <!-- Use Savings Checkbox -->
        <Checkbox
          v-model="formData.useSavings"
          :label="t('goal_form_use_savings')"
          id="use-savings"
        />

        <!-- Single Savings (when only one savings available) -->
        <template v-if="formData.useSavings && savingsOptions.length === 1">
          <SelectInput
            v-model="formData.selectedSavings[0].savingsId"
            :options="savingsOptions"
            :placeholder="t('goal_form_select_savings_placeholder')"
          />

          <div v-if="formData.selectedSavings[0].savingsId">
            <CurrencyInput
              v-model="formData.selectedSavings[0].amount"
              :placeholder="t('goal_form_savings_amount_label')"
              :required="formData.useSavings"
              :currency="baseCurrency || formData.currency || undefined"
              :locale="localeString"
              :min="0"
              :max="getMaxSavingsAmount(formData.selectedSavings[0].savingsId)"
            />
          </div>
        </template>

        <!-- Multiple Savings (when more than one savings available) -->
        <template v-else-if="formData.useSavings && savingsOptions.length > 1">
          <div class="space-y-3">
            <div
              v-for="(saving, index) in formData.selectedSavings"
              :key="index"
              class="p-4 border border-gray-200 rounded-lg space-y-3"
            >
              <div class="flex items-center justify-end">
                <button
                  v-if="formData.selectedSavings.length > 1"
                  type="button"
                  @click="removeSavings(index)"
                  class="text-red-600 hover:text-red-800 text-sm font-medium"
                >
                  {{ t('delete') }}
                </button>
              </div>

              <SelectInput
                v-model="saving.savingsId"
                :options="getAvailableSavingsOptions(saving.savingsId)"
                :placeholder="t('goal_form_select_savings_placeholder')"
              />

              <div v-if="saving.savingsId">
                <CurrencyInput
                  v-model="saving.amount"
                  :placeholder="t('goal_form_savings_amount_label')"
                  :required="true"
                  :currency="baseCurrency || formData.currency || undefined"
                  :locale="localeString"
                  :min="0"
                  :max="getMaxSavingsAmount(saving.savingsId)"
                />
              </div>
            </div>

            <button
              v-if="canAddMoreSavings"
              type="button"
              @click="addSavings"
              class="w-full px-4 py-2 text-sm border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-800 transition"
            >
              {{ t('goal_form_add_savings') }}
            </button>
          </div>
        </template>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <button
          type="button"
          class="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
          @click="handleCloseModal"
        >
          {{ t('cancel') }}
        </button>
        <button
          type="button"
          class="px-4 py-2 text-sm rounded-lg bg-black text-white hover:bg-gray-900 transition disabled:opacity-60 disabled:cursor-not-allowed"
          :disabled="!canSubmit || isSaving"
          @click="handleSubmit"
        >
          {{ isSaving ? (t('saving') || 'Saving...') : (isEditing ? t('goal_form_update') : t('goal_form_submit')) }}
        </button>
      </div>
    </template>
  </FormModal>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useTranslation } from '@/i18n'
import { type CurrencyCode } from '@/constants/currency'
import { useCurrentScenario } from '@/composables/useCurrentScenario'
import { useSavings } from '@/composables/useSavings'
import { useGoalSavingsAllocations } from '@/composables/useGoalSavingsAllocations'
import { calculateInterestSinceDate } from '@/utils/compoundInterest'
import type { CapitalizationPeriodCode } from '@/constants/capitalizationPeriod'
import FormModal from '@/components/forms/FormModal.vue'
import TextInput from '@/components/forms/TextInput.vue'
import SelectInput from '@/components/forms/SelectInput.vue'
import CurrencyInput from '@/components/forms/CurrencyInput.vue'
import Checkbox from '@/components/forms/Checkbox.vue'

export interface SavingsUsage {
  savingsId: string | null
  amount: number | null
}

export interface GoalFormData {
  name: string
  targetAmount: number | null
  currency: CurrencyCode | null
  targetDate: string | null
  useSavings: boolean
  selectedSavings: SavingsUsage[]
}

interface Props {
  modelValue: boolean
  formData: GoalFormData
  isSaving: boolean
  canSubmit: boolean
  isEditing?: boolean
  goalId?: string | null // ID редактируемой цели (для исключения из расчета использованных сумм)
  localeString: string
  currencyOptions: Array<{ label: string; value: CurrencyCode }>
  minDate: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'close'): void
  (e: 'submit'): void
}>()

const { t } = useTranslation()
const { scenario } = useCurrentScenario()

// Get savings options and data
const scenarioId = computed(() => scenario.value?.id ?? null)
const { getSavingsOptions, savings, convertedAmounts } = useSavings(scenarioId)
const savingsOptions = computed(() => getSavingsOptions.value)

// Load goal savings allocations (only when modal is open)
const { getAvailableAmount } = useGoalSavingsAllocations(
  computed(() => props.modelValue ? scenarioId.value : null)
)

// Get base currency
const baseCurrency = computed(() => {
  return (scenario.value?.base_currency as CurrencyCode | null) ?? null
})

// Initialize selectedSavings array when useSavings is enabled
watch(
  () => props.formData.useSavings,
  (useSavings) => {
    if (useSavings && props.formData.selectedSavings.length === 0) {
      // Initialize with one empty entry
      props.formData.selectedSavings.push({
        savingsId: null,
        amount: null,
      })
    } else if (!useSavings) {
      // Clear when disabled - use splice to maintain reactivity
      props.formData.selectedSavings.splice(0, props.formData.selectedSavings.length)
    }
  },
  { immediate: true }
)

// Get available savings options (excluding already selected ones)
const getAvailableSavingsOptions = (currentSavingsId: string | null) => {
  const selectedIds = props.formData.selectedSavings
    .map(s => s.savingsId)
    .filter(id => id !== null && id !== currentSavingsId) as string[]
  
  return savingsOptions.value.filter(option => 
    !selectedIds.includes(option.value)
  )
}

// Check if we can add more savings
const canAddMoreSavings = computed(() => {
  const totalSavings = savingsOptions.value.length
  const selectedCount = props.formData.selectedSavings.filter(
    s => s.savingsId !== null
  ).length
  return selectedCount < totalSavings
})

// Add new savings entry
const addSavings = () => {
  props.formData.selectedSavings.push({
    savingsId: null,
    amount: null,
  })
}

// Remove savings entry
const removeSavings = (index: number) => {
  props.formData.selectedSavings.splice(index, 1)
}

// Calculate max amount for a specific savings (converted to base currency)
// Takes into account amounts already used in other goals
const getMaxSavingsAmount = (savingsId: string | null): number => {
  if (!savingsId || !savings.value) {
    return 0
  }

  const selectedSaving = savings.value.find(s => s.id === savingsId)
  if (!selectedSaving) {
    return 0
  }

  // Calculate total amount (principal + interest)
  let totalAmount = selectedSaving.amount

  // Add interest if available
  if (selectedSaving.interest_rate && selectedSaving.capitalization_period) {
    const startDate = selectedSaving.deposit_date || selectedSaving.created_at
    if (startDate) {
      try {
        const interest = calculateInterestSinceDate(
          selectedSaving.amount,
          selectedSaving.interest_rate,
          selectedSaving.capitalization_period as CapitalizationPeriodCode,
          startDate
        )
        totalAmount = selectedSaving.amount + interest
      } catch (error) {
        console.error('[GoalFormModal] Error calculating interest:', error)
      }
    }
  }

  // Get available amount (total - used in other goals, excluding current goal if editing)
  const availableAmount = getAvailableAmount(
    savingsId,
    totalAmount,
    selectedSaving.currency,
    props.goalId || null
  )

  // If saving currency matches base currency, return available amount directly
  if (baseCurrency.value && selectedSaving.currency === baseCurrency.value) {
    return availableAmount
  }

  // For currency conversion: we need to convert the available amount
  // But we need to calculate the ratio first
  if (baseCurrency.value && convertedAmounts.value) {
    const convertedTotal = convertedAmounts.value[selectedSaving.id]
    if (convertedTotal != null && typeof convertedTotal === 'number') {
      // Calculate conversion ratio
      const conversionRatio = convertedTotal / totalAmount
      // Apply ratio to available amount
      return availableAmount * conversionRatio
    }
  }

  // If no base currency or conversion not available, return available amount in original currency
  return availableAmount
}

const showModal = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const handleCloseModal = () => {
  emit('close')
  showModal.value = false
}

const handleSubmit = () => {
  emit('submit')
}
</script>
