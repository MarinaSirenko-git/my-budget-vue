<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-6">
    <div class="text-center space-y-6 max-w-md">
      <div class="text-8xl flex items-center justify-center gap-4">
        <span>🐭</span>
        <span>😢</span>
      </div>
      <div class="space-y-2">
        <h1 class="text-4xl font-bold text-gray-900">
          {{ t('not_found_title') }}
        </h1>
        <p class="text-lg text-gray-600">
          {{ t('not_found_message') }}
        </p>
      </div>
      <router-link
        :to="backHomePath"
        class="inline-block px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-900 transition-colors"
      >
        {{ t('not_found_back_home') }}
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useTranslation } from '@/i18n'
import { useHeadMeta } from '@/composables/useHeadMeta'

const route = useRoute()
const { t } = useTranslation()

// Set page metadata
useHeadMeta({
  title: () => t('not_found_title'),
  description: () => t('not_found_message')
})

const backHomePath = computed(() => {
  // Try to extract slug from params.pathMatch array (catch-all route)
  const pathMatch = route.params.pathMatch as string[] | string | undefined
  let slug: string | undefined
  
  if (Array.isArray(pathMatch) && pathMatch.length > 0) {
    slug = pathMatch[0]
  } else if (typeof pathMatch === 'string') {
    slug = pathMatch.split('/')[0]
  } else if (route.params.slug) {
    slug = route.params.slug as string
  } else {
    // Fallback: try to extract from path
    const pathParts = route.path.split('/').filter(Boolean)
    if (pathParts.length > 0) {
      slug = pathParts[0]
    }
  }
  
  if (slug) {
    return `/${slug}/income`
  }
  return '/'
})
</script>
