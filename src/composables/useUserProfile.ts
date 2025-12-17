import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { supabase } from './useSupabase'
import { useCurrentUser } from './useCurrentUser'

type UserProfile = {
  language: string | null
}

/**
 * Composable for fetching current user profile
 * Uses Vue Query for caching and automatic state management
 */
export const useUserProfile = () => {
  const { userId } = useCurrentUser()

  const queryKey = computed(() => ['userProfile', userId.value])
  const enabled = computed(() => !!userId.value)

  const {
    data: profile,
    isLoading,
    isError,
    error,
  } = useQuery<UserProfile | null>({
    queryKey,
    queryFn: async () => {
      if (!userId.value) {
        return null
      }

      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('language')
        .eq('id', userId.value)
        .maybeSingle()

      if (profileError) {
        throw profileError
      }

      return data
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  })

  const language = computed(() => profile.value?.language ?? null)

  return {
    profile,
    language,
    isLoading,
    isError,
    error,
  }
}
