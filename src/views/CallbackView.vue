<template>
  <div class="min-h-screen flex items-center justify-center bg-white text-black relative overflow-hidden">
    <div class="text-center space-y-2">
      <h1 class="text-3xl font-bold">{{ t('redirecting_title') }}</h1>
      <p class="text-gray-600 text-sm">
        {{ t('redirecting_message') }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTranslation } from '@/i18n'

const { t } = useTranslation()

// TODO: Fetch user session, load scenario by user id, and redirect to /:slug/income
</script>

