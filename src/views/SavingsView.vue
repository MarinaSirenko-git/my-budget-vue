<template>
  <div class="p-6">
    <!-- Empty State -->
    <div class="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8">
      <!-- Emojis -->
      <div class="text-6xl flex items-center justify-center gap-4">
        <span>🐭</span>
        <span>💰</span>
      </div>

      <!-- Title and Subtitle -->
      <div class="space-y-3 max-w-md">
        <h1 class="text-2xl font-bold text-gray-900">
          {{ t('savings_empty_title') }}
        </h1>
        <p class="text-md text-gray-600">
          {{ t('savings_empty_subtitle') }}
        </p>
      </div>

      <!-- Add Savings Button -->
      <button
        class="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-900 transition-colors text-sm font-medium"
        @click="handleAddSavings"
      >
        {{ t('savings_empty_add_first') }}
      </button>
    </div>

    <!-- Add Savings Modal -->
    <FormModal
      v-model="showModal"
      :title="t('savings_form_title')"
    >
      <template #body>
        <div class="space-y-4">
          <!-- Name -->
          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700">
              {{ t('savings_form_name_label') }}
            </label>
            <TextInput
              v-model="formData.name"
              :placeholder="t('savings_form_name_label')"
              :required="true"
            />
          </div>

          <!-- Amount -->
          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700">
              {{ t('savings_form_amount_label') }}
            </label>
            <CurrencyInput
              v-model="formData.amount"
              :placeholder="t('savings_form_amount_label')"
              :required="true"
              :currency="formData.currency || undefined"
              :locale="localeString"
              :min="0.01"
            />
          </div>

          <!-- Currency -->
          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700">
              {{ t('savings_form_currency_label') }}
            </label>
            <SelectInput
              v-model="formData.currency"
              :options="currencyOptions"
              :placeholder="t('select_currency_placeholder')"
              :searchable="true"
            />
          </div>

          <!-- Interest Checkbox -->
          <div class="space-y-2">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                v-model="formData.earningInterest"
                type="checkbox"
                class="w-4 h-4 text-black border-gray-300 rounded focus:ring-2 focus:ring-black focus:ring-offset-0"
              />
              <span class="text-sm font-medium text-gray-700">
                {{ t('savings_form_interest_label') }}
              </span>
            </label>
          </div>

          <!-- Interest Rate -->
          <div v-if="formData.earningInterest" class="space-y-2">
            <label class="block text-sm font-medium text-gray-700">
              {{ t('savings_form_interest_rate_label') }}
            </label>
            <TextInput
              v-model="formData.interestRate"
              type="number"
              :placeholder="t('savings_form_interest_rate_label')"
              :required="true"
            />
          </div>

          <!-- Capitalization Period -->
          <div v-if="formData.earningInterest" class="space-y-2">
            <label class="block text-sm font-medium text-gray-700">
              {{ t('savings_form_capitalization_period_label') }}
            </label>
            <SelectInput
              v-model="formData.capitalizationPeriod"
              :options="capitalizationPeriodOptions"
              :placeholder="t('savings_form_capitalization_period_label')"
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
            {{ t('savings_form_submit') }}
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
import { getCapitalizationPeriodOptions, type CapitalizationPeriodCode } from '@/constants/capitalizationPeriod'
import { useCurrentScenario } from '@/composables/useCurrentScenario'
import i18next from 'i18next'
import FormModal from '@/components/forms/FormModal.vue'
import TextInput from '@/components/forms/TextInput.vue'
import SelectInput from '@/components/forms/SelectInput.vue'
import CurrencyInput from '@/components/forms/CurrencyInput.vue'

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

// Get capitalization period options
const capitalizationPeriodOptions = computed(() => {
  return getCapitalizationPeriodOptions(currentLocale.value)
})

// Modal state
const showModal = ref(false)

// Form data
const formData = ref({
  name: '',
  amount: null as number | null,
  currency: null as CurrencyCode | null,
  earningInterest: false,
  interestRate: '',
  capitalizationPeriod: null as CapitalizationPeriodCode | null,
})

// Reset form when modal closes
watch(showModal, (isOpen) => {
  if (!isOpen) {
    formData.value = {
      name: '',
      amount: null,
      currency: null,
      earningInterest: false,
      interestRate: '',
      capitalizationPeriod: null,
    }
  } else {
    // Set default currency from scenario when modal opens, if not already set
    if (!formData.value.currency) {
      const scenarioCurrency = scenario.value?.base_currency as CurrencyCode | null | undefined
      if (scenarioCurrency && currencyOptions.some(opt => opt.value === scenarioCurrency)) {
        formData.value.currency = scenarioCurrency
      } else if (currencyOptions.length > 0) {
        formData.value.currency = currencyOptions[0].value
      }
    }
  }
})

const canSubmit = computed(() => {
  const baseValid =
    formData.value.name.trim() !== '' &&
    formData.value.amount !== null &&
    formData.value.amount > 0 &&
    formData.value.currency !== null

  // If earning interest, validate interest fields
  if (formData.value.earningInterest) {
    const interestRateValue = parseFloat(formData.value.interestRate)
    return (
      baseValid &&
      formData.value.interestRate.trim() !== '' &&
      !isNaN(interestRateValue) &&
      interestRateValue > 0 &&
      interestRateValue <= 100 &&
      formData.value.capitalizationPeriod !== null
    )
  }

  return baseValid
})

const handleAddSavings = () => {
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

  // TODO: Implement saving savings when functionality is ready
  console.log('Submitting savings:', formData.value)

  handleCloseModal()
}
</script>
