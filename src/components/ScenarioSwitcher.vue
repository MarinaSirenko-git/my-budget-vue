<template>
  <div ref="rootRef" class="relative">
    <!-- Single scenario - just text -->
    <div v-if="!isLoading && scenarios && scenarios.length <= 1" class="flex items-center">
      <span class="text-sm font-semibold text-gray-900">
        {{ scenario?.name || 'Сценарий' }}
      </span>
    </div>

    <!-- Multiple scenarios - dropdown -->
    <div v-else-if="!isLoading && scenarios && scenarios.length > 1" class="relative">
      <button
        type="button"
        class="flex items-center gap-2 text-sm font-semibold text-gray-900 hover:text-gray-700 transition-colors"
        @click="toggleDropdown"
      >
        <span>{{ scenario?.name}}</span>
        <svg
          class="w-4 h-4 transition-transform"
          :class="{ 'rotate-180': isOpen }"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <!-- Dropdown menu -->
      <div
        v-if="isOpen"
        class="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[200px]"
      >
        <ul class="py-1">
          <li
            v-for="scenarioOption in scenarios"
            :key="scenarioOption.id"
            class="px-4 py-2 cursor-pointer hover:bg-gray-100 transition-colors flex items-center justify-between"
            :class="{
              'bg-gray-50': scenarioOption.slug === scenario?.slug,
            }"
            @click="selectScenario(scenarioOption.slug)"
          >
            <span class="text-sm text-gray-900 flex-1">{{ scenarioOption.name || scenarioOption.slug }}</span>
            <div class="flex items-center ml-2 w-6 h-6 justify-center">
              <span
                v-if="scenarioOption.slug === scenario?.slug"
                class="text-gray-500 text-sm"
              >
                ✓
              </span>
              <button
                v-else
                type="button"
                class="p-1 text-gray-400 hover:text-red-600 transition-colors"
                @click.stop="handleDeleteScenario(scenarioOption.id)"
                title="Удалить сценарий"
              >
                <svg
                  class="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
              </button>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <!-- Loading state -->
    <div v-else class="flex items-center">
      <span class="text-sm font-semibold text-gray-400">
        {{ t('loading') }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onBeforeUnmount, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useQueryClient } from '@tanstack/vue-query'
import { useCurrentScenario, type Scenario } from '@/composables/useCurrentScenario'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { supabase } from '@/composables/useSupabase'
import { useTranslation } from '@/i18n'
import { queryKeys } from '@/lib/queryKeys'

const router = useRouter()
const route = useRoute()
const { t } = useTranslation()
const { scenario, scenarios, isLoading } = useCurrentScenario()
const { userId } = useCurrentUser()
const queryClient = useQueryClient()

const isOpen = ref(false)
const rootRef = ref<HTMLElement | null>(null)

const toggleDropdown = () => {
  isOpen.value = !isOpen.value
}

const selectScenario = (slug: string) => {
  if (slug === scenario.value?.slug) {
    isOpen.value = false
    return
  }

  // Get current route path and replace slug
  const currentPath = route.path
  const pathParts = currentPath.split('/')
  pathParts[1] = slug // Replace slug in path
  const newPath = pathParts.join('/')

  router.push(newPath)
  isOpen.value = false
}

const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as Node | null
  const root = rootRef.value
  if (root && target && !root.contains(target)) {
    isOpen.value = false
  }
}

const handleDeleteScenario = async (scenarioId: string) => {
  const confirmed = confirm('Вы уверены, что хотите удалить этот сценарий?')
  if (!confirmed) return

  try {
    const { error } = await supabase.rpc('delete_scenario', {
      p_scenario_id: scenarioId,
    })

    if (error) throw error

    // Обновить кеш
    if (userId.value) {
      queryClient.setQueryData<Scenario[]>(
        queryKeys.scenarios.list(userId.value),
        (old) => old?.filter((s) => s.id !== scenarioId) || []
      )

      // Инвалидировать детальный запрос сценария, если он был удален
      queryClient.invalidateQueries({ queryKey: queryKeys.scenarios.all })
    }
  } catch (error) {
    console.error('Failed to delete scenario:', error)
    alert('Не удалось удалить сценарий. Попробуйте еще раз.')
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleClickOutside)
})
</script>
