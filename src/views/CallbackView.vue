<template>
  <div class="min-h-screen flex items-center justify-center bg-white text-black relative overflow-hidden">
    <div class="text-center space-y-2">
      <h1 class="text-3xl font-bold">{{ t('redirecting_title') }}</h1>
      <p class="text-gray-600 text-sm" :class="{ 'text-red-600': hasError }">
        {{ statusMessage }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import i18next from 'i18next'
import { supabase } from '@/composables/useSupabase'
import { useTranslation } from '@/i18n'

const { t } = useTranslation()

const router = useRouter()
const statusMessage = ref(t('redirecting_message'))
const hasError = ref(false)
const NEW_USER_WINDOW_MS = 5 * 60 * 1000

const fetchUserAndRedirect = async () => {
  try {
    // Ensure we have a session
    const { error: sessionError } = await supabase.auth.getSession()
    if (sessionError) throw sessionError

    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) {
      throw error || new Error('User not found')
    }

  const createdAt = new Date(data.user.created_at).getTime()
  const isNewUser = Date.now() - createdAt < NEW_USER_WINDOW_MS

  // Get user profile to set language
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('language')
    .eq('id', data.user.id)
    .maybeSingle()

  if (profileError) throw profileError
  if (profile?.language) {
    await i18next.changeLanguage(profile.language)
    statusMessage.value = t('detecting_language_message')
  }

  // If user is new, show base currency form
  if (isNewUser) {
    statusMessage.value = t('base_currency_setup_message')
    // TODO: Redirect to base currency selection form once implemented
    return
  }

  statusMessage.value = t('detecting_scenario_message')

  const { data: scenario, error: scenarioError } = await supabase
    .from('scenarios')
    .select('slug')
    .eq('user_id', data.user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (scenarioError) throw scenarioError
  if (!scenario?.slug) throw new Error('Scenario slug is missing')

  const target = `/${scenario.slug}/income`
  await router.replace(target)
  } catch (error) {
    console.error('Failed to fetch user', error)
    statusMessage.value = t('scenario_slug_error_message')
    hasError.value = true
    setTimeout(() => router.replace('/auth'), 1500)
  }
}

onMounted(fetchUserAndRedirect)
</script>

