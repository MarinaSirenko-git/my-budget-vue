<template>
  <RouterView />
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { RouterView } from 'vue-router'
import i18next from 'i18next'
import { useUserProfile } from '@/composables/useUserProfile'

const { language: profileLanguage } = useUserProfile()

// Initialize language from profile when app starts
onMounted(() => {
  if (profileLanguage.value) {
    i18next.changeLanguage(profileLanguage.value)
  }
})

// Watch for profile language changes and update i18next
watch(
  profileLanguage,
  (newLanguage) => {
    if (newLanguage && i18next.language !== newLanguage) {
      i18next.changeLanguage(newLanguage)
    }
  },
  { immediate: true }
)
</script>

