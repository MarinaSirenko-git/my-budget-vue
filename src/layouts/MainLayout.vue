<template>
  <div class="min-h-screen bg-gray-50 flex">
    <!-- Sidebar -->
    <aside class="w-64 bg-white border-r border-gray-200">
      <div class="h-full flex flex-col">
        <div class="px-4 py-4 border-b border-gray-200 max-h-[60px]">
          <h2 class="text-xl font-bold text-gray-900 font-handwriting">Mousee</h2>
        </div>
        <nav class="px-2 py-4">
          <ul class="space-y-2">
            <li>
              <router-link
                :to="`/${slug}/income`"
                class="block px-2 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition"
                active-class="bg-gray-100 font-semibold"
              >
                {{ t('nav_my_income') }}
              </router-link>
            </li>
            <li>
              <router-link
                :to="`/${slug}/savings`"
                class="block px-2 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition"
                active-class="bg-gray-100 font-semibold"
              >
                {{ t('nav_my_savings') }}
              </router-link>
            </li>
            <li>
              <router-link
                :to="`/${slug}/expense`"
                class="block px-2 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition"
                active-class="bg-gray-100 font-semibold"
              >
                {{ t('nav_my_expense') }}
              </router-link>
            </li>
            <li>
              <router-link
                :to="`/${slug}/goal`"
                class="block px-2 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition"
                active-class="bg-gray-100 font-semibold"
              >
                {{ t('nav_my_goal') }}
              </router-link>
            </li>
            <li>
              <router-link
                :to="`/${slug}/report`"
                class="block px-2 py-2 text-gray-700 hover:bg-gray-100 transition rounded-lg"
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
          >
            {{ t('nav_how_can_help') }}
          </router-link>
          <router-link
            :to="`/${slug}/settings`"
            class="block px-2 py-2 text-gray-700 hover:bg-gray-100 transition rounded-lg"
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
    <div class="flex-1 flex flex-col min-w-0">
      <!-- Header -->
      <header class="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0 min-h-[60px] max-h-[60px] flex items-center">
        <div class="flex items-center justify-between w-full">
          <ScenarioSwitcher />
          <div class="flex items-center gap-4">
            <ScenarioCreator />
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
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { RouterView } from 'vue-router'
import { useTranslation } from '@/i18n'
import ScenarioSwitcher from '@/components/ScenarioSwitcher.vue'
import ScenarioCreator from '@/components/ScenarioCreator.vue'

const route = useRoute()
const { t } = useTranslation()

const slug = computed(() => route.params.slug as string)

// Mock summary data
const summary = ref({
  income: 0,
  savings: 0,
  expense: 0,
  goal: 0,
  balance: 0
})

const formatCurrency = (amount: number) => {
  return `${amount.toFixed(2)} ${t('currency_symbol')}`
}

const handleSignOut = () => {
  // TODO: Implement sign out logic
  console.log('Sign out clicked')
}
</script>
