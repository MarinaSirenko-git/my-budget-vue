import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import { supabase } from './useSupabase'
import { useCurrentUser } from './useCurrentUser'

export interface Scenario {
  id: string
  slug: string
  name?: string | null
  base_currency?: string | null
  user_id: string
  created_at?: string
}

export const useCurrentScenario = () => {
  const route = useRoute()
  const slug = computed(() => route.params.slug as string)
  const { userId } = useCurrentUser()

  // Query for all user scenarios
  const scenariosQueryKey = computed(() => ['scenarios', userId.value])
  const scenariosEnabled = computed(() => !!userId.value)

  const {
    data: scenarios,
    isLoading: isLoadingScenarios,
    isError: isScenariosError,
    error: scenariosError,
  } = useQuery<Scenario[]>({
    queryKey: scenariosQueryKey,
    queryFn: async () => {
      if (!userId.value) {
        return []
      }

      const { data, error: scenariosError } = await supabase
        .from('scenarios')
        .select('id, slug, name, base_currency, user_id, created_at')
        .eq('user_id', userId.value)
        .order('created_at', { ascending: true })

      if (scenariosError) {
        throw scenariosError
      }

      return data || []
    },
    enabled: scenariosEnabled,
  })

  // Query for current scenario
  const queryKey = computed(() => ['scenario', slug.value, userId.value])
  const enabled = computed(() => !!slug.value && !!userId.value)

  const {
    data: scenario,
    isLoading: isLoadingScenario,
    isError: isScenarioError,
    error: scenarioError,
  } = useQuery<Scenario | null>({
    queryKey,
    queryFn: async () => {
      if (!userId.value || !slug.value) {
        return null
      }

      const { data, error: scenarioError } = await supabase
        .from('scenarios')
        .select('id, slug, name, base_currency, user_id, created_at')
        .eq('user_id', userId.value)
        .eq('slug', slug.value)
        .maybeSingle()

      if (scenarioError) {
        throw scenarioError
      }

      return data
    },
    enabled,
  })

  return {
    scenario,
    scenarios,
    slug,
    isLoading: computed(() => isLoadingScenario.value || isLoadingScenarios.value),
    isError: computed(() => isScenarioError.value || isScenariosError.value),
    error: scenarioError.value || scenariosError.value,
  }
}
