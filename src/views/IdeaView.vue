<template>
  <div class="p-6 max-w-4xl mx-auto">
    <div class="space-y-8">
      <div class="text-center space-y-4">
        <div class="text-6xl flex items-center justify-center gap-4 mb-4">
          <span>🐭</span>
          <span>💡</span>
        </div>
        <h1 class="text-3xl font-bold text-gray-900">
          {{ t('idea_title') }}
        </h1>
      </div>

      <div class="space-y-6 text-gray-700">
        <section class="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h2 class="text-xl font-semibold text-gray-900 mb-3">
            {{ t('idea_envelope_method_title') }}
          </h2>
          <p class="text-base leading-relaxed">
            {{ t('idea_envelope_method_text') }}
          </p>
        </section>

        <section class="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h2 class="text-xl font-semibold text-gray-900 mb-3">
            {{ t('idea_always_available_title') }}
          </h2>
          <p class="text-base leading-relaxed">
            {{ t('idea_always_available_text') }}
          </p>
        </section>

        <section class="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h2 class="text-xl font-semibold text-gray-900 mb-3">
            {{ t('idea_features_title') }}
          </h2>
          <div class="space-y-4">
            <div>
              <h3 class="text-base font-medium text-gray-900 mb-2">
                {{ t('idea_currency_title') }}
              </h3>
              <p class="text-base leading-relaxed">
                {{ t('idea_currency_text') }}
              </p>
            </div>
            <div>
              <h3 class="text-base font-medium text-gray-900 mb-2">
                {{ t('idea_scenarios_title') }}
              </h3>
              <p class="text-base leading-relaxed">
                {{ t('idea_scenarios_text') }}
              </p>
            </div>
            <div>
              <h3 class="text-base font-medium text-gray-900 mb-2">
                {{ t('idea_auto_calc_title') }}
              </h3>
              <p class="text-base leading-relaxed">
                {{ t('idea_auto_calc_text') }}
              </p>
            </div>
            <div>
              <h3 class="text-base font-medium text-gray-900 mb-2">
                {{ t('idea_goals_title') }}
              </h3>
              <p class="text-base leading-relaxed">
                {{ t('idea_goals_text') }}
              </p>
            </div>
            <div>
              <h3 class="text-base font-medium text-gray-900 mb-2">
                {{ t('idea_security_title') }}
              </h3>
              <p class="text-base leading-relaxed">
                {{ t('idea_security_text') }}
              </p>
            </div>
            <div>
              <h3 class="text-base font-medium text-gray-900 mb-2">
                {{ t('idea_share_title') }}
              </h3>
              <p class="text-base leading-relaxed">
                {{ t('idea_share_text') }}
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTranslation } from '@/i18n'

const { t } = useTranslation()
</script>
