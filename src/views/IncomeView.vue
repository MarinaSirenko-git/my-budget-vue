<template>
  <div class="p-6">
    <!-- Empty State -->
    <div class="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8">
      <!-- Emojis -->
      <div class="text-6xl flex items-center justify-center gap-4">
        <span>🐭</span>
        <span>💵</span>
      </div>

      <!-- Title and Subtitle -->
      <div class="space-y-3 max-w-md">
        <h1 class="text-2xl font-bold text-gray-900">
          {{ t('income_empty_title') }}
        </h1>
        <p class="text-md text-gray-600">
          {{ t('income_empty_subtitle') }}
        </p>
      </div>

      <!-- Income Options Tags -->
      <div class="grid grid-cols-3 gap-3 max-w-2xl">
        <button
          v-for="option in incomeOptions"
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
import { getIncomeCategories, type IncomeType } from '@/constants/financialCategories'
import i18next from 'i18next'

const { t } = useTranslation()

// Get current locale from i18next
const currentLocale = computed<'en' | 'ru'>(() => {
  const lang = i18next.language || i18next.languages?.[0] || 'en'
  return lang.startsWith('ru') ? 'ru' : 'en'
})

// Get income categories with labels
const incomeOptions = computed<IncomeType[]>(() => {
  return getIncomeCategories(currentLocale.value)
})

const handleOptionClick = (option: IncomeType) => {
  // TODO: Implement adding income when functionality is ready
  console.log('Selected income option:', option)
}
</script>

<style scoped>
.emoji-monochrome {
  filter: grayscale(100%);
}

@keyframes bounce-slow {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.animate-bounce-slow {
  animation: bounce-slow 3s ease-in-out infinite;
}

.animate-bounce-slow span:nth-child(1) {
  animation-delay: 0s;
}

.animate-bounce-slow span:nth-child(2) {
  animation-delay: 0.2s;
}

.animate-bounce-slow span:nth-child(3) {
  animation-delay: 0.4s;
}

.animate-bounce-slow span:nth-child(4) {
  animation-delay: 0.6s;
}
</style>
