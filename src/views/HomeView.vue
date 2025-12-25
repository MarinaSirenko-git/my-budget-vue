<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center">
    <div class="text-center">
      <h1 class="text-4xl font-bold text-gray-900 mb-4">
        {{ t('welcome') }}
      </h1>
      <p class="text-gray-600">
        My Budget Vue App
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTranslation } from '@/i18n'
import { useHeadMeta } from '@/composables/useHeadMeta'

const { t } = useTranslation()

// Set page metadata
useHeadMeta({
  title: () => t('page_title_dashboard'),
  description: () => t('page_description_dashboard')
})
</script>

