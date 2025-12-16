<template>
  <div>
    <Button
      :text="t('add_alternative_scenario')"
      variant="primary"
      @click="showModal = true"
    />

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
import { computed, ref, watch } from 'vue'
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

const canSave = computed(() => {
  return scenarioName.value.trim().length > 0 && !isLoading.value
})

watch(scenarioName, (newValue) => {
  if (scenarioNameError.value && newValue.trim().length > 0) {
    scenarioNameError.value = null
  }
})

watch(showModal, (isOpen) => {
  if (isOpen) {
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
</script>
