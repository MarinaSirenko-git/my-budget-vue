<template>
  <div class="p-6">
    <!-- Loading State -->
    <div v-if="isDataLoading" class="flex items-center justify-center min-h-[60vh]">
      <p>{{ t('loading') }}</p>
    </div>

    <!-- Incomes List (if incomes exist) -->
    <div v-else-if="incomes && incomes.length > 0" class="max-w-6xl mx-auto">
      <!-- Toolbar -->
      <div class="flex justify-end items-center gap-4 mb-2">
        <Button
          variant="primary"
          @click="showModal = true"
        >
          {{ t('income_form_submit') }}
        </Button>
      </div>

      <table class="w-full border-collapse border border-black">
        <thead>
          <tr class="border-b border-black">
            <th class="border-r border-black px-4 py-3 text-left text-sm font-medium text-black bg-white">{{ t('income_table_column_category') }}</th>
            <th class="border-r border-black px-4 py-3 text-left text-sm font-medium text-black bg-white">{{ t('income_table_column_expected_amount') }}</th>
            <th ref="currencyHeaderRef" class="border-r border-black px-4 py-3 text-left text-sm font-medium text-black bg-white relative">
              <div class="flex items-center justify-between gap-2">
                <span>{{ t('income_table_column_base_currency') }}</span>
                <button
                  type="button"
                  class="flex items-center gap-1 hover:opacity-70 transition-opacity"
                  @click="toggleCurrencyDropdown"
                >
                  <span class="text-sm font-medium">{{ displayBaseCurrency || '—' }}</span>
                  <svg
                    class="w-4 h-4 transition-transform"
                    :class="{ 'rotate-180': isCurrencyDropdownOpen }"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
              </div>
              
              <!-- Currency Dropdown -->
              <Teleport to="body">
                <div
                  v-if="isCurrencyDropdownOpen"
                  ref="currencyDropdownRef"
                  class="fixed bg-white border border-gray-200 rounded-xl shadow-lg z-[60] max-h-64 overflow-auto"
                  :style="currencyDropdownStyle"
                >
                  <ul>
                    <li
                      v-for="option in currencyOptions"
                      :key="option.value"
                      class="px-4 py-2 cursor-pointer flex items-center justify-between hover:bg-gray-100 transition-colors"
                      :class="{
                        'bg-gray-50': option.value === displayBaseCurrency,
                      }"
                      @click="selectCurrency(option.value)"
                    >
                      <span class="truncate">{{ option.label }}</span>
                      <span
                        v-if="option.value === displayBaseCurrency"
                        class="text-gray-500 text-xs ml-2"
                      >
                        ✓
                      </span>
                    </li>
                  </ul>
                </div>
              </Teleport>
            </th>
            <th class="border-r border-black px-4 py-3 text-left text-sm font-medium text-black bg-white">{{ t('income_table_column_frequency') }}</th>
            <th class="border-r border-black px-4 py-3 text-left text-sm font-medium text-black bg-white">{{ t('income_table_column_payment_day') }}</th>
            <th class="border-black px-4 py-3 text-left text-sm font-medium text-black bg-white">{{ t('income_table_column_actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="income in incomes"
            :key="income.id"
            class="border-b border-black"
          >
            <td class="border-r border-black px-4 py-3 text-sm text-black bg-white">{{ income.type }}</td>
            <td class="border-r border-black px-4 py-3 text-sm text-black bg-white">{{ formatCurrency(income.amount, income.currency) }}</td>
            <td class="border-r border-black px-4 py-3 text-sm text-black bg-white">{{ formatBaseCurrency(income.amount, income.currency) }}</td>
            <td class="border-r border-black px-4 py-3 text-sm text-black bg-white">{{ formatFrequency(income.frequency) }}</td>
            <td class="border-r border-black px-4 py-3 text-sm text-black bg-white">{{ income.payment_day }}</td>
            <td class="border-black px-4 py-3 text-sm text-black bg-white">
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="p-1 hover:bg-gray-100 rounded transition"
                  :aria-label="t('income_table_edit')"
                  @click="handleEdit(income)"
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
                  :aria-label="t('income_table_delete')"
                  @click="handleDelete(income)"
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
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Empty State (only when loading is complete and no data) -->
    <EmptyState
      v-else
      :emojis="['🐭', '💵']"
      :title="t('income_empty_title')"
      :subtitle="t('income_empty_subtitle')"
      :options="incomeOptionsForEmptyState"
      @option-click="(option) => handleOptionClick(option as unknown as IncomeType)"
    />

    <!-- Add Income Modal -->
    <IncomeFormModal
      v-model="showModal"
      :form-data="formData"
      :is-saving="isSaving"
      :can-submit="canSubmit"
      :is-editing="!!editingIncomeId"
      :locale-string="localeString"
      :currency-options="currencyOptions"
      :frequency-options="frequencyOptions"
      :day-options="dayOptions"
      @close="handleCloseModal"
      @submit="handleSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { Teleport } from 'vue'
import { useTranslation } from '@/i18n'
import { getIncomeCategories, type IncomeType } from '@/constants/financialCategories'
import { currencyOptions, type CurrencyCode } from '@/constants/currency'
import { getFrequencyOptions, getFrequencyLabel, type FrequencyCode } from '@/constants/frequency'
import { useCurrentScenario } from '@/composables/useCurrentScenario'
import { useIncomes, type Income } from '@/composables/useIncomes'
import { useIncomeForm } from '@/composables/useIncomeForm'
import { useQueryClient } from '@tanstack/vue-query'
import { supabase } from '@/composables/useSupabase'
import i18next from 'i18next'
import EmptyState from '@/components/EmptyState.vue'
import IncomeFormModal from '@/components/incomes/IncomeFormModal.vue'
import Button from '@/components/Button.vue'

const { t } = useTranslation()
const { scenario, isLoading: isLoadingScenario } = useCurrentScenario()
const queryClient = useQueryClient()

// Use incomes composable - передаем computed для реактивности
const scenarioId = computed(() => {
  const id = scenario.value?.id
  return id
})
const { incomes, isLoading: isLoadingIncomes, isFetching: isFetchingIncomes } = useIncomes(scenarioId)

const isDataLoading = computed(() => {
  const result = (() => {

    if (isLoadingScenario.value) return true
    if (scenario.value && incomes.value === undefined) return true
    if (isLoadingIncomes.value || isFetchingIncomes.value) return true
    
    return false
  })()
  
  return result
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

// Get income categories with labels
const incomeOptions = computed<IncomeType[]>(() => {
  return getIncomeCategories(currentLocale.value)
})

// Transform income options for EmptyState component
const incomeOptionsForEmptyState = computed(() => {
  return incomeOptions.value.map(option => ({
    ...option, // Include all properties including id and label
  }))
})

// Get frequency options
const frequencyOptions = computed(() => {
  return getFrequencyOptions(currentLocale.value)
})

// Get day options (1-31)
const dayOptions = computed(() => {
  return Array.from({ length: 31 }, (_, i) => {
    const day = i + 1
    return {
      label: day.toString(),
      value: day.toString(),
    }
  })
})

// Use income form composable
const {
  formData,
  isSaving,
  showModal,
  canSubmit,
  editingIncomeId,
  handleOptionClick,
  handleCloseModal,
  handleSubmit,
  startEdit,
} = useIncomeForm(scenarioId, scenario, frequencyOptions)

// Display base currency state
const displayBaseCurrency = ref<CurrencyCode | null>(null)

// Initialize display base currency from scenario
watch(() => scenario.value?.base_currency, (newCurrency) => {
  if (newCurrency && !displayBaseCurrency.value) {
    displayBaseCurrency.value = newCurrency as CurrencyCode
  }
}, { immediate: true })

// Currency dropdown state
const isCurrencyDropdownOpen = ref(false)
const currencyHeaderRef = ref<HTMLElement | null>(null)
const currencyDropdownRef = ref<HTMLElement | null>(null)
const currencyDropdownStyle = ref<{ top: string; left: string; width: string } | null>(null)

const toggleCurrencyDropdown = async () => {
  isCurrencyDropdownOpen.value = !isCurrencyDropdownOpen.value
  
  if (isCurrencyDropdownOpen.value) {
    await nextTick()
    updateCurrencyDropdownPosition()
  }
}

const updateCurrencyDropdownPosition = () => {
  if (!currencyHeaderRef.value || !currencyDropdownRef.value) return

  const headerRect = currencyHeaderRef.value.getBoundingClientRect()
  const dropdownRect = currencyDropdownRef.value.getBoundingClientRect()
  
  // Calculate position
  let top = headerRect.bottom + 4
  let left = headerRect.left
  let width = headerRect.width

  // Check if dropdown would overflow bottom of viewport
  const spaceBelow = window.innerHeight - headerRect.bottom
  const spaceAbove = headerRect.top
  
  // If not enough space below but more space above, show above
  if (spaceBelow < 200 && spaceAbove > spaceBelow) {
    top = headerRect.top - dropdownRect.height - 4
  }

  // Ensure dropdown doesn't overflow viewport horizontally
  if (left + width > window.innerWidth) {
    left = window.innerWidth - width - 16
  }
  if (left < 16) {
    left = 16
  }

  currencyDropdownStyle.value = {
    top: `${top}px`,
    left: `${left}px`,
    width: `${width}px`,
  }
}

const selectCurrency = (currency: CurrencyCode) => {
  displayBaseCurrency.value = currency
  isCurrencyDropdownOpen.value = false
  currencyDropdownStyle.value = null
}

const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as Node | null
  const header = currencyHeaderRef.value
  const dropdown = currencyDropdownRef.value
  
  if (
    header &&
    dropdown &&
    target &&
    !header.contains(target) &&
    !dropdown.contains(target)
  ) {
    isCurrencyDropdownOpen.value = false
    currencyDropdownStyle.value = null
  }
}

const handleResize = () => {
  if (isCurrencyDropdownOpen.value) {
    updateCurrencyDropdownPosition()
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
  window.addEventListener('resize', handleResize)
  window.addEventListener('scroll', handleResize, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleClickOutside)
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('scroll', handleResize, true)
})

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

// Format frequency label
const formatFrequency = (frequency: string) => {
  return getFrequencyLabel(frequency as FrequencyCode, currentLocale.value)
}

// Format amount in base currency
const formatBaseCurrency = (amount: number, incomeCurrency: string) => {
  const targetCurrency = displayBaseCurrency.value
  if (!targetCurrency) {
    return '—'
  }
  
  // If income currency matches target currency, show the same amount
  if (incomeCurrency === targetCurrency) {
    return formatCurrency(amount, targetCurrency)
  }
  
  // TODO: Implement currency conversion when API is available
  // For now, show dash if currencies don't match
  return '—'
}

// Handle edit income
const handleEdit = (income: Income) => {
  startEdit(income)
}

// Handle delete income
const handleDelete = async (income: Income) => {
  const confirmMessage = t('income_delete_confirm', { type: income.type })
  const confirmed = window.confirm(confirmMessage)
  
  if (!confirmed) {
    return
  }

  try {
    const { error } = await supabase
      .from('incomes')
      .delete()
      .eq('id', income.id)

    if (error) {
      throw error
    }

    // Invalidate incomes query to refresh the list
    queryClient.invalidateQueries({ queryKey: ['incomes'] })
  } catch (error) {
    console.error('Failed to delete income:', error)
    // Show error message to user
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete income'
    window.alert(errorMessage)
  }
}
</script>


