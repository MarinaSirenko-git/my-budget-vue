<template>
  <div class="min-h-screen flex items-center justify-center bg-white text-black relative overflow-hidden">
    <div class="text-center space-y-2">
      <h1 class="text-3xl font-bold">{{ t('redirecting_title') }}</h1>
      <p class="text-gray-600 text-sm" :class="{ 'text-red-600': hasError }">
        {{ statusMessage }}
      </p>
    </div>
    <FormModal
      v-model="showBaseCurrencyModal"
      :title="t('base_currency_setup_title')"
      :description="t('base_currency_setup_description')"
      :close-on-backdrop="true"
      @close="handleBaseCurrencyClose"
    >
      <template #body>
        <SelectInput
          v-model="selectedCurrency"
          :options="currencyOptions"
          :placeholder="t('select_currency_placeholder')"
          :helper-text="t('select_currency_helper')"
          :error="baseCurrencyError"
        />
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
            @click="handleBaseCurrencyClose"
          >
            {{ t('cancel') }}
          </button>
          <button
            type="button"
            class="px-4 py-2 text-sm rounded-lg bg-black text-white hover:bg-gray-900 transition disabled:opacity-60 disabled:cursor-not-allowed"
            :disabled="!selectedCurrency"
            @click="handleBaseCurrencySubmit"
          >
            {{ t('continue') }}
          </button>
        </div>
      </template>
    </FormModal>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useQueryClient } from '@tanstack/vue-query'
import i18next from 'i18next'
import { supabase } from '@/composables/useSupabase'
import { useTranslation } from '@/i18n'
import { useHeadMeta } from '@/composables/useHeadMeta'
import { currencyOptions, type CurrencyCode } from '@/constants/currency'
import FormModal from '@/components/forms/FormModal.vue'
import SelectInput from '@/components/forms/SelectInput.vue'
import { useUserProfile } from '@/composables/useUserProfile'

const { t } = useTranslation()

// Set page metadata
useHeadMeta({
  title: () => t('redirecting_title'),
  description: () => t('redirecting_message')
})

const { language: profileLanguage } = useUserProfile()
const queryClient = useQueryClient()

const router = useRouter()
const route = useRoute()
const statusMessage = ref(t('redirecting_message'))
const hasError = ref(false)
const NEW_USER_WINDOW_MS = 5 * 60 * 1000
const showBaseCurrencyModal = ref(false)
const selectedCurrency = ref<CurrencyCode | null>('USD')
const baseCurrencyError = ref<string | null>(null)
const cachedUserId = ref<string | null>(null)
const cachedScenario = ref<{ id: string; slug: string; base_currency?: CurrencyCode | null } | null>(null)
const languageSet = ref(false)

const proceedWithScenario = async () => {
  if (!cachedUserId.value) return

  statusMessage.value = t('detecting_scenario_message')

  if (!cachedScenario.value) {
    const { data: scenario, error: scenarioError } = await supabase
      .from('scenarios')
      .select('id, slug, base_currency')
      .eq('user_id', cachedUserId.value)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (scenarioError) throw scenarioError
    if (!scenario?.slug) {
      await router.replace('/')
      return
    }
    cachedScenario.value = {
      id: scenario.id,
      slug: scenario.slug,
      base_currency: (scenario.base_currency as CurrencyCode | null) ?? null,
    }
  }

  if (!cachedScenario.value?.slug) {
    await router.replace('/')
    return
  }

  // Prefetch incomes data before redirect (non-blocking)
  // This will populate the cache so IncomeView can use it immediately
  if (cachedScenario.value.id && cachedUserId.value) {
    queryClient.prefetchQuery({
      queryKey: ['incomes', cachedUserId.value, cachedScenario.value.id],
      queryFn: async () => {
        const { data, error: incomesError } = await supabase
          .from('incomes_decrypted')
          .select('*')
          .eq('user_id', cachedUserId.value!)
          .eq('scenario_id', cachedScenario.value?.id!)
          .order('created_at', { ascending: false })

        if (incomesError) {
          console.error('[CallbackView] prefetchQuery ERROR', incomesError)
          throw incomesError
        }

        return data || []
      },
      staleTime: 2 * 60 * 1000, // Same as useIncomes
    }).catch((error) => {
      // Silently fail - don't block redirect if prefetch fails
      console.warn('Failed to prefetch incomes:', error)
    })
  }

  // Check if there's a redirect parameter from query string
  // Vue Router can return string, string[] or undefined
  const redirectQuery = route.query.redirect
  const redirectPath = Array.isArray(redirectQuery) 
    ? redirectQuery[0] // If array, take the first element
    : (redirectQuery as string | undefined)
  
  // Validate redirect path to prevent open redirect vulnerability
  const isValidInternalPath = (path: string): boolean => {
    // Must start with / and be a relative path
    if (!path.startsWith('/')) return false
    
    // Check that there are no protocol-relative URLs (//evil.com)
    if (path.startsWith('//')) return false
    
    // Check that there are no protocols (http://, https://, javascript:, data:, etc.)
    if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(path)) return false
    
    // Check that the path doesn't contain dangerous characters
    if (/[<>"']/.test(path)) return false
    
    return true
  }
  
  // If there's a redirect and it's valid (safe internal path), use it
  // Otherwise use the default path to the first scenario
  const target = redirectPath && typeof redirectPath === 'string' && isValidInternalPath(redirectPath)
    ? redirectPath 
    : `/${cachedScenario.value.slug}/income`
  
  await router.replace(target)
}

const handleBaseCurrencySubmit = async () => {
  if (!selectedCurrency.value) {
    baseCurrencyError.value = t('select_currency_error')
    return
  }
  baseCurrencyError.value = null
  showBaseCurrencyModal.value = false
  if (cachedScenario.value?.id) {
    const { error } = await supabase
      .from('scenarios')
      .update({ base_currency: selectedCurrency.value })
      .eq('id', cachedScenario.value.id)
    if (error) {
      baseCurrencyError.value = error.message
      showBaseCurrencyModal.value = true
      return
    }
    cachedScenario.value.base_currency = selectedCurrency.value
  }
  await proceedWithScenario()
}

const handleBaseCurrencyClose = async () => {
  showBaseCurrencyModal.value = false
  baseCurrencyError.value = null
  selectedCurrency.value = selectedCurrency.value ?? 'USD'
  await proceedWithScenario()
}

const fetchUserAndRedirect = async () => {
  try {
    // Ensure we have a session
    const { error: sessionError } = await supabase.auth.getSession()
    if (sessionError) throw sessionError

    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) {
      throw error || new Error('User not found')
    }

    // Ensure user.id exists before proceeding
    if (!data.user.id) {
      throw new Error('User ID is missing')
    }

    const createdAt = new Date(data.user.created_at).getTime()
    const isNewUser = Date.now() - createdAt < NEW_USER_WINDOW_MS
    cachedUserId.value = data.user.id

    // Wait for profile to load and set language
    // Profile is loaded via useUserProfile composable with caching
    if (profileLanguage.value) {
      await i18next.changeLanguage(profileLanguage.value)
      statusMessage.value = t('detecting_language_message')
      languageSet.value = true
    }

    // Preload first scenario to pick up existing base currency (if any)
    const { data: scenario, error: scenarioError } = await supabase
      .from('scenarios')
      .select('id, slug, base_currency')
      .eq('user_id', data.user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (scenarioError) throw scenarioError
    if (scenario?.slug) {
      cachedScenario.value = {
        id: scenario.id,
        slug: scenario.slug,
        base_currency: (scenario.base_currency as CurrencyCode | null) ?? null,
      }
    }

    // If scenario is not found, redirect to root where router will handle it
    if (!scenario?.slug) {
      await router.replace('/')
      return
    }

    // If user is new, skip modal, use default USD (or scenario base currency if present)
    if (isNewUser) {
      selectedCurrency.value = cachedScenario.value?.base_currency ?? 'USD'
    statusMessage.value = t('base_currency_setup_message')
    showBaseCurrencyModal.value = true
      await proceedWithScenario()
      return
    }

  // Existing user: proceed directly
  await proceedWithScenario()
  return
  } catch (error) {
    console.error('Failed to fetch user', error)
    
    // Check for session/auth errors
    if (
      error instanceof Error && (
        error.message === 'User ID is missing' ||
        error.message === 'User not found' ||
        (error as any)?.status === 401
      )
    ) {
      statusMessage.value = t('session_expired_message')
    } else {
      statusMessage.value = t('scenario_slug_error_message')
    }
    
    hasError.value = true
    setTimeout(() => router.replace('/auth'), 1500)
  }
}

// Watch for profile language to be loaded
watch(
  profileLanguage,
  async (newLanguage) => {
    if (newLanguage && !languageSet.value) {
      await i18next.changeLanguage(newLanguage)
      statusMessage.value = t('detecting_language_message')
      languageSet.value = true
    }
  },
  { immediate: true }
)

onMounted(fetchUserAndRedirect)
</script>
