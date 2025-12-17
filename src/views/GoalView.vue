<template>
  <div class="p-6">
    <!-- Empty State -->
    <EmptyState
      :emojis="['🐭', '🎯']"
      :title="t('goal_empty_title')"
      :subtitle="t('goal_empty_subtitle')"
      :action-button="{ label: t('goal_empty_add_first'), onClick: handleAddGoal }"
    />

    <!-- Add Goal Modal -->
    <FormModal
      v-model="showModal"
      :title="t('goal_form_title')"
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

          <!-- Amount -->
          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700">
              {{ t('goal_form_amount_label') }}
            </label>
            <CurrencyInput
              v-model="formData.amount"
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
            :disabled="!canSubmit"
            @click="handleSubmit"
          >
            {{ t('goal_form_submit') }}
          </button>
        </div>
      </template>
    </FormModal>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useTranslation } from '@/i18n'
import { currencyOptions, type CurrencyCode } from '@/constants/currency'
import { useCurrentScenario } from '@/composables/useCurrentScenario'
import i18next from 'i18next'
import FormModal from '@/components/forms/FormModal.vue'
import TextInput from '@/components/forms/TextInput.vue'
import SelectInput from '@/components/forms/SelectInput.vue'
import CurrencyInput from '@/components/forms/CurrencyInput.vue'
import EmptyState from '@/components/EmptyState.vue'

const { t } = useTranslation()
const { scenario } = useCurrentScenario()

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
const formData = ref({
  name: '',
  amount: null as number | null,
  currency: null as CurrencyCode | null,
  targetDate: null as string | null,
})

// Reset form when modal closes
watch(showModal, (isOpen) => {
  if (!isOpen) {
    formData.value = {
      name: '',
      amount: null,
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
    formData.value.amount !== null &&
    formData.value.amount > 0 &&
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

const handleSubmit = () => {
  if (!canSubmit.value) return

  // TODO: Implement saving goal when functionality is ready
  console.log('Submitting goal:', formData.value)

  handleCloseModal()
}
</script>
