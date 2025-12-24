<template>
  <div class="h-screen bg-gray-50 flex overflow-hidden">
    <!-- Backdrop overlay for mobile drawer -->
    <div
      v-if="isDrawerOpen"
      class="fixed inset-0 bg-black/50 z-40 lg:hidden"
      @click="closeDrawer"
    />

    <!-- Sidebar / Drawer -->
    <aside
      ref="sidebarRef"
      class="fixed lg:relative inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 h-full overflow-y-auto flex-shrink-0 transform transition-transform duration-300 ease-in-out lg:translate-x-0"
      :class="{
        '-translate-x-full': !isDrawerOpen,
        'translate-x-0': isDrawerOpen,
      }"
    >
      <div class="h-full flex flex-col">
        <div class="px-4 py-4 border-b border-gray-200 max-h-[60px] flex items-center justify-between">
          <h2 class="text-xl font-bold text-gray-900 font-handwriting">Mousee</h2>
          <!-- Close button for mobile -->
          <button
            type="button"
            class="lg:hidden p-2 text-gray-500 hover:text-gray-700 focus:outline-none"
            aria-label="Close menu"
            @click="closeDrawer"
          >
            <svg
              class="w-6 h-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <nav class="px-2 py-4">
          <ul class="space-y-2">
            <li>
              <router-link
                :to="`/${slug}/income`"
                class="block px-2 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition"
                active-class="bg-gray-100 font-semibold"
                @click="closeDrawer"
              >
                {{ t('nav_my_income') }}
              </router-link>
            </li>
            <li>
              <router-link
                :to="`/${slug}/savings`"
                class="block px-2 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition"
                active-class="bg-gray-100 font-semibold"
                @click="closeDrawer"
              >
                {{ t('nav_my_savings') }}
              </router-link>
            </li>
            <li>
              <router-link
                :to="`/${slug}/expense`"
                class="block px-2 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition"
                active-class="bg-gray-100 font-semibold"
                @click="closeDrawer"
              >
                {{ t('nav_my_expense') }}
              </router-link>
            </li>
            <li>
              <router-link
                :to="`/${slug}/goal`"
                class="block px-2 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition"
                active-class="bg-gray-100 font-semibold"
                @click="closeDrawer"
              >
                {{ t('nav_my_goal') }}
              </router-link>
            </li>
            <li>
              <router-link
                :to="`/${slug}/report`"
                class="block px-2 py-2 text-gray-700 hover:bg-gray-100 transition rounded-lg"
                @click="closeDrawer"
              >
                {{ t('nav_download_report') }}
              </router-link>
            </li>
          </ul>
        </nav>

        <!-- Summary Section -->
        <div class="px-4 py-4 border-t border-gray-200">
          <h3 class="text-xs uppercase text-gray-400 mb-3">{{ t('summary_title') }}</h3>
          <div class="space-y-4 text-base">
            <div class="flex justify-between items-center">
              <span class="text-gray-700">{{ t('summary_income') }}</span>
              <span class="text-sm text-gray-900">{{ formatCurrency(summary.income) }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-700">{{ t('summary_savings') }}</span>
              <span class="text-sm text-gray-900">{{ formatCurrency(summary.savings) }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-700">{{ t('summary_expense') }}</span>
              <span class="text-sm ftext-gray-900">{{ formatCurrency(summary.expense) }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-700">{{ t('summary_goal') }}</span>
              <span class="text-sm text-gray-900">{{ formatCurrency(summary.goal) }}</span>
            </div>
            <div class="flex justify-between items-center pt-2 border-t border-gray-200">
              <span class="text-gray-700">{{ t('summary_balance') }}</span>
              <span class="text-sm text-gray-900">{{ formatCurrency(summary.balance) }}</span>
            </div>
          </div>
        </div>

        <!-- Bottom Section -->
        <div class="px-2 py-4 space-y-2 mt-auto">
          <router-link
            :to="`/${slug}/idea`"
            class="block px-2 py-2 text-gray-700 hover:bg-gray-100 transition rounded-lg"
            @click="closeDrawer"
          >
            {{ t('nav_how_can_help') }}
          </router-link>
          <router-link
            :to="`/${slug}/settings`"
            class="block px-2 py-2 text-gray-700 hover:bg-gray-100 transition rounded-lg"
            @click="closeDrawer"
          >
            {{ t('nav_settings') }}
          </router-link>
          <button
            type="button"
            class="w-full text-left px-2 py-2 text-gray-700 hover:bg-gray-100 transition rounded-lg"
            @click="handleSignOut"
          >
            {{ t('sign_out') }}
          </button>
        </div>
      </div>
    </aside>

    <!-- Main Content Area -->
    <div class="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
      <!-- Header -->
      <header class="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex-shrink-0 min-h-[60px] max-h-[60px] flex items-center">
        <div class="flex items-center justify-between w-full gap-4">
          <!-- Hamburger menu button (mobile only) -->
          <button
            type="button"
            class="lg:hidden p-2 text-gray-700 hover:bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
            aria-label="Open menu"
            @click="openDrawer"
          >
            <svg
              class="w-6 h-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div class="flex-1 flex items-center justify-between lg:justify-start gap-4">
            <ScenarioSwitcher />
            <div class="flex items-center gap-2 sm:gap-4">
              <ScenarioCreator />
            </div>
          </div>
        </div>
      </header>

      <!-- Page Content -->
      <main class="flex-1 overflow-auto">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { RouterView } from 'vue-router'
import { useQueryClient } from '@tanstack/vue-query'
import { useTranslation } from '@/i18n'
import { supabase } from '@/composables/useSupabase'
import { useAmounts } from '@/composables/useAmounts'
import { useCurrentScenario } from '@/composables/useCurrentScenario'
import { useSummary } from '@/composables/useSummary'
import ScenarioSwitcher from '@/components/ScenarioSwitcher.vue'
import ScenarioCreator from '@/components/ScenarioCreator.vue'

const route = useRoute()
const router = useRouter()
const queryClient = useQueryClient()
const { t } = useTranslation()
const { formatCurrency } = useAmounts()
const { scenario } = useCurrentScenario()

const slug = computed(() => route.params.slug as string)

// Get scenario ID for queries
const scenarioId = computed(() => scenario.value?.id ?? null)

// Get summary from composable
const { summary } = useSummary(scenarioId)

// Drawer state for mobile
const isDrawerOpen = ref(false)
const sidebarRef = ref<HTMLElement | null>(null)

const openDrawer = () => {
  isDrawerOpen.value = true
  // Prevent body scroll when drawer is open
  document.body.style.overflow = 'hidden'
}

const closeDrawer = () => {
  isDrawerOpen.value = false
  // Restore body scroll
  document.body.style.overflow = ''
}

// Close drawer when clicking outside (mobile only)
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as Node | null
  const sidebar = sidebarRef.value
  
  if (
    sidebar &&
    target &&
    !sidebar.contains(target) &&
    isDrawerOpen.value &&
    window.innerWidth < 1024 // Only on mobile/tablet
  ) {
    closeDrawer()
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
  // Close drawer on route change (mobile only)
  router.afterEach(() => {
    if (window.innerWidth < 1024) {
      closeDrawer()
    }
  })
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleClickOutside)
  // Ensure body scroll is restored
  document.body.style.overflow = ''
})

const handleSignOut = async () => {
  try {
    // Sign out from Supabase
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      throw new Error(`Failed to sign out: ${error.message}`)
    }

    // Invalidate all user-related queries
    queryClient.invalidateQueries({ queryKey: ['currentUser'] })
    queryClient.invalidateQueries({ queryKey: ['userProfile'] })
    queryClient.invalidateQueries({ queryKey: ['scenarios'] })
    queryClient.invalidateQueries({ queryKey: ['scenario'] })

    // Redirect to auth page
    router.push('/auth')
  } catch (error) {
    console.error('Failed to sign out:', error)
  }
}
</script>
