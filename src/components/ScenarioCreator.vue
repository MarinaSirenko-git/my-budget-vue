<template>
  <div class="relative">
    <!-- Кнопка с иконкой плюса (мобильные и планшеты) -->
    <button
      type="button"
      class="lg:hidden w-11 h-11 min-w-[44px] min-h-[44px] bg-black text-white rounded-md hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 transition-colors flex items-center justify-center disabled:bg-gray-400 disabled:cursor-not-allowed"
      :aria-label="t('add_alternative_scenario')"
      @click="handleButtonClick"
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
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    </button>

    <!-- Кнопка с текстом (ноутбуки и большие экраны) -->
    <Button
      variant="primary"
      class="hidden lg:flex"
      @click="showModal = true"
    >
      {{ t('add_alternative_scenario') }}
    </Button>

    <!-- Tooltip для мобильных устройств (показывается при клике) -->
    <Transition name="fade">
      <div
        v-if="showTooltip"
        class="lg:hidden absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap z-50 pointer-events-none"
      >
        {{ t('add_alternative_scenario') }}
        <!-- Стрелка вниз -->
        <div class="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
          <div class="w-2 h-2 bg-gray-900 rotate-45"></div>
        </div>
      </div>
    </Transition>

    <FormModal
      v-model="showModal"
      :title="t('create_scenario_title')"
    >
      <template #body>
        <div class="space-y-4">
          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700">
              {{ t('scenario_name_placeholder') }}
            </label>
            <TextInput
              v-model="scenarioName"
              :placeholder="t('scenario_name_placeholder')"
              :required="true"
              :max-length="100"
              :error="scenarioNameError"
            />
          </div>

          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700">
              {{ t('scenario_currency_label') }}
            </label>
            <SelectInput
              v-model="selectedCurrency"
              :options="currencyOptions"
              :placeholder="t('select_currency_placeholder')"
              :searchable="true"
            />
          </div>

          <div v-if="createError" class="text-sm text-red-600">
            {{ createError }}
          </div>

          <div class="flex gap-3 pt-2">
            <Button
              :text="t('create_scenario_from_scratch')"
              variant="secondary"
              class="flex-1"
              :disabled="!canSave || isLoading"
              @click="handleCreateFromScratch"
            />
            <Button
              :text="t('clone_current_scenario')"
              variant="primary"
              class="flex-1"
              :disabled="!canSave || isLoading"
              @click="handleCloneCurrent"
            />
          </div>
        </div>
      </template>
    </FormModal>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useTranslation } from '@/i18n'
import { supabase } from '@/composables/useSupabase'
import { useAppQueryClient } from '@/composables/useQueryClient'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { currencyOptions, type CurrencyCode } from '@/constants/currency'
import type { Scenario } from '@/composables/useCurrentScenario'
import Button from './Button.vue'
import FormModal from './forms/FormModal.vue'
import TextInput from './forms/TextInput.vue'
import SelectInput from './forms/SelectInput.vue'

const { t } = useTranslation()
const router = useRouter()
const queryClient = useAppQueryClient()
const { userId } = useCurrentUser()

const showModal = ref(false)
const scenarioName = ref('')
const selectedCurrency = ref<CurrencyCode | null>('USD')
const scenarioNameError = ref<string | null>(null)
const createError = ref<string | null>(null)
const isLoading = ref(false)

// Tooltip state для мобильных
const showTooltip = ref(false)
let tooltipTimer: ReturnType<typeof setTimeout> | null = null

const canSave = computed(() => {
  return scenarioName.value.trim().length > 0 && !isLoading.value
})

watch(scenarioName, (newValue) => {
  if (scenarioNameError.value && newValue.trim().length > 0) {
    scenarioNameError.value = null
  }
})

const handleButtonClick = () => {
  // Показываем tooltip при клике на мобильных и планшетах (< 1024px)
  if (window.innerWidth < 1024) {
    showTooltip.value = true
    // Очищаем предыдущий таймер, если он есть
    if (tooltipTimer) {
      clearTimeout(tooltipTimer)
    }
    // Автоматически скрываем через 2 секунды
    tooltipTimer = setTimeout(() => {
      showTooltip.value = false
      tooltipTimer = null
    }, 2000)
  }
  // Открываем модалку
  showModal.value = true
}

watch(showModal, (isOpen) => {
  if (isOpen) {
    // Скрываем tooltip при открытии модалки
    showTooltip.value = false
    if (tooltipTimer) {
      clearTimeout(tooltipTimer)
      tooltipTimer = null
    }
    // Reset form when modal opens
    scenarioName.value = ''
    selectedCurrency.value = 'USD'
    scenarioNameError.value = null
    createError.value = null
    isLoading.value = false
  } else {
    // Reset loading state when modal closes
    isLoading.value = false
  }
})

const validateForm = (): boolean => {
  if (!scenarioName.value.trim()) {
    scenarioNameError.value = t('scenario_name_required')
    return false
  }
  if (!selectedCurrency.value) {
    createError.value = t('select_currency_error')
    return false
  }
  return true
}

const createScenario = async (isClone: boolean) => {
  if (!validateForm()) {
    return
  }

  isLoading.value = true
  createError.value = null

  try {
    const { data, error: rpcError } = await supabase.rpc('create_scenario', {
      p_base_currency: selectedCurrency.value,
      p_name: scenarioName.value.trim(),
      p_is_clone: isClone,
    })

    if (rpcError) {
      throw rpcError
    }

    if (!data) {
      throw new Error('Failed to create scenario')
    }

    // data is the ID (UUID) of the created scenario
    const scenarioId = data as string

    // Fetch full scenario data including base_currency
    const { data: newScenario, error: fetchError } = await supabase
      .from('scenarios')
      .select('id, slug, name, base_currency, user_id, created_at')
      .eq('id', scenarioId)
      .eq('user_id', userId.value)
      .maybeSingle()

    if (fetchError || !newScenario) {
      throw fetchError || new Error('Failed to fetch created scenario')
    }

    // Update scenarios cache by adding the new scenario
    if (userId.value) {
      queryClient.setQueryData<Scenario[]>(
        ['scenarios', userId.value],
        (old) => {
          if (!old) return [newScenario]
          // Check if scenario already exists (shouldn't, but just in case)
          const exists = old.some(s => s.id === newScenario.id)
          if (exists) {
            // Update existing scenario
            return old.map(s => s.id === newScenario.id ? newScenario : s)
          }
          // Add new scenario, sorted by created_at
          return [...old, newScenario].sort((a, b) => {
            const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
            const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
            return aTime - bTime
          })
        }
      )

      // Pre-populate cache for the new scenario (will be used after redirect)
      queryClient.setQueryData<Scenario>(
        ['scenario', newScenario.slug, userId.value],
        newScenario
      )
    }

    // Close modal
    showModal.value = false

    // Navigate to new scenario
    router.push(`/${newScenario.slug}/income`)
  } catch (error) {
    console.error('Failed to create scenario:', error)
    createError.value = error instanceof Error ? error.message : 'Failed to create scenario'
  } finally {
    isLoading.value = false
  }
}

const handleCreateFromScratch = () => {
  createScenario(false)
}

const handleCloneCurrent = () => {
  createScenario(true)
}

// Очищаем таймер при размонтировании компонента
onBeforeUnmount(() => {
  if (tooltipTimer) {
    clearTimeout(tooltipTimer)
  }
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
