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
  </div>
</template>

<script setup lang="ts">
import { useTranslation } from '@/i18n'

const { t } = useTranslation()

const handleAddSavings = () => {
  // TODO: Implement adding savings when functionality is ready
  console.log('Add savings clicked')
}
</script>
