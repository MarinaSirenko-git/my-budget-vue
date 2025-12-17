<template>
  <div class="p-6">

    <div class="max-w-2xl mx-auto">
      <h1 class="text-4xl font-bold text-gray-900 mb-8">
        {{ t('page_title_settings') }}
      </h1>

      <!-- Settings Form -->
      <form class="space-y-6" @submit.prevent="handleSubmit">
        <!-- Email Field (Read-only) -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">
            {{ t('settings_email_label') }}
          </label>
          <TextInput
            v-model="formData.email"
            type="email"
            :disabled="true"
            :placeholder="t('settings_email_placeholder')"
          />
          <p class="text-sm text-gray-500">
            {{ t('settings_email_helper') }}
          </p>
        </div>

        <!-- Scenario Name Field -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">
            {{ t('settings_scenario_name_label') }}
          </label>
          <TextInput
            v-model="formData.scenarioName"
            :placeholder="t('settings_scenario_name_placeholder')"
            :required="true"
          />
        </div>

        <!-- Currency Selector -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">
            {{ t('settings_currency_label') }}
          </label>
          <SelectInput
            v-model="formData.currency"
            :options="currencyOptions"
            :placeholder="t('select_currency_placeholder')"
            :searchable="true"
          />
        </div>

        <!-- Language Selector -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">
            {{ t('settings_language_label') }}
          </label>
          <SelectInput
            v-model="formData.language"
            :options="languageOptions"
            :placeholder="t('settings_language_placeholder')"
          />
        </div>

        <!-- Submit Button -->
        <div class="flex justify-end pt-4">
          <button
            type="submit"
            class="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-900 transition disabled:opacity-60 disabled:cursor-not-allowed"
            :disabled="!canSubmit || isSaving"
          >
            {{ isSaving ? t('saving') : t('save') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useTranslation } from '@/i18n'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { useCurrentScenario } from '@/composables/useCurrentScenario'
import { useUserProfile } from '@/composables/useUserProfile'
import { currencyOptions, type CurrencyCode } from '@/constants/currency'
import { languageOptions } from '@/constants/language'
import { supabase } from '@/composables/useSupabase'
import i18next from 'i18next'
import TextInput from '@/components/forms/TextInput.vue'
import SelectInput from '@/components/forms/SelectInput.vue'
import { useQueryClient } from '@tanstack/vue-query'

const { t } = useTranslation()
const { user } = useCurrentUser()
const { scenario } = useCurrentScenario()
const { language: profileLanguage } = useUserProfile()
const queryClient = useQueryClient()

// Form data
const formData = ref({
  email: '',
  scenarioName: '',
  currency: null as CurrencyCode | null,
  language: null as string | null,
})

// Loading state
const isSaving = ref(false)
const currentLanguage = ref<string | null>(null)

// Load initial data
onMounted(async () => {
  // Set email from user
  if (user.value?.email) {
    formData.value.email = user.value.email
  }

  // Set scenario name and currency
  if (scenario.value) {
    formData.value.scenarioName = scenario.value.name || ''
    formData.value.currency = (scenario.value.base_currency as CurrencyCode) || null
  }

  // Set language from cached profile (loaded via useUserProfile)
  if (profileLanguage.value) {
    formData.value.language = profileLanguage.value
    currentLanguage.value = profileLanguage.value
  } else {
    // Fallback to current i18next language
    const lang = i18next.language || i18next.languages?.[0] || 'en'
    const normalizedLang = lang.startsWith('ru') ? 'ru' : 'en'
    formData.value.language = normalizedLang
    currentLanguage.value = normalizedLang
  }
})

// Watch for scenario changes
watch(
  () => scenario.value,
  (newScenario) => {
    if (newScenario) {
      formData.value.scenarioName = newScenario.name || ''
      formData.value.currency = (newScenario.base_currency as CurrencyCode) || null
    }
  },
  { immediate: true }
)

// Watch for user changes
watch(
  () => user.value?.email,
  (newEmail) => {
    if (newEmail) {
      formData.value.email = newEmail
    }
  },
  { immediate: true }
)

// Watch for profile language changes
watch(
  profileLanguage,
  (newLanguage) => {
    if (newLanguage) {
      formData.value.language = newLanguage
      currentLanguage.value = newLanguage
    }
  },
  { immediate: true }
)

const canSubmit = computed(() => {
  return (
    formData.value.scenarioName.trim() !== '' &&
    formData.value.currency !== null &&
    formData.value.language !== null
  )
})

const handleSubmit = async () => {
  if (!canSubmit.value || !user.value || !scenario.value) return

  isSaving.value = true

  try {
    // Update scenario name and currency
    const { error: scenarioError } = await supabase.rpc('rename_scenario', {
      p_scenario_id: scenario.value.id,
      p_new_name: formData.value.scenarioName.trim(),
      p_base_currency: formData.value.currency,
    })

    if (scenarioError) throw scenarioError

    // Update profile language if changed
    if (formData.value.language !== currentLanguage.value) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ language: formData.value.language })
        .eq('id', user.value.id)

      if (profileError) throw profileError

      // Update i18next language
      if (formData.value.language) {
        await i18next.changeLanguage(formData.value.language)
        currentLanguage.value = formData.value.language
      }

      // Invalidate profile query to refresh cached data
      queryClient.invalidateQueries({ queryKey: ['userProfile'] })
    }

    // Invalidate scenario queries to refresh data
    queryClient.invalidateQueries({ queryKey: ['scenario'] })
    queryClient.invalidateQueries({ queryKey: ['scenarios'] })
  } catch (error) {
    console.error('Failed to save settings:', error)
    // TODO: Show error message to user
  } finally {
    isSaving.value = false
  }
}
</script>
