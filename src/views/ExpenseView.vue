<template>
  <div class="p-6">
    <!-- Empty State -->
    <div class="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8">
      <!-- Emojis -->
      <div class="text-6xl flex items-center justify-center gap-4">
        <span>🐭</span>
        <span>💸</span>
      </div>

      <!-- Title and Subtitle -->
      <div class="space-y-3 max-w-md">
        <h1 class="text-2xl font-bold text-gray-900">
          {{ t('expense_empty_title') }}
        </h1>
        <p class="text-md text-gray-600">
          {{ t('expense_empty_subtitle') }}
        </p>
      </div>

      <!-- Expense Options Tags -->
      <div class="grid grid-cols-3 gap-3 max-w-2xl">
        <button
          v-for="option in expenseOptions"
          :key="option.id"
          class="w-full px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900 transition-colors text-sm font-medium"
          @click="handleOptionClick(option)"
        >
          {{ option.label }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useTranslation } from '@/i18n'
import { getExpenseCategories, type ExpenseCategory } from '@/constants/financialCategories'
import i18next from 'i18next'

const { t } = useTranslation()

// Get current locale from i18next
const currentLocale = computed<'en' | 'ru'>(() => {
  const lang = i18next.language || i18next.languages?.[0] || 'en'
  return lang.startsWith('ru') ? 'ru' : 'en'
})

// Get expense categories with labels
const expenseOptions = computed<ExpenseCategory[]>(() => {
  return getExpenseCategories(currentLocale.value)
})

const handleOptionClick = (option: ExpenseCategory) => {
  // TODO: Implement adding expense when functionality is ready
  console.log('Selected expense option:', option)
}
</script>
