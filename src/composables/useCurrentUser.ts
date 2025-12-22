import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { supabase } from './useSupabase'
import type { User } from '@supabase/supabase-js'
import { queryKeys } from '@/lib/queryKeys'

/**
 * Composable for fetching current authenticated user
 * Uses Vue Query for caching and automatic state management
 */
export const useCurrentUser = () => {
  const {
    data: user,
    isLoading,
    isError,
    error,
  } = useQuery<User | null>({
    queryKey: queryKeys.currentUser.all,
    queryFn: async () => {
      const { data, error: userError } = await supabase.auth.getUser()
      if (userError || !data.user) {
        return null
      }
      return data.user
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  })

  const userId = computed(() => user.value?.id ?? null)

  return {
    user,
    userId,
    isLoading,
    isError,
    error,
  }
}
