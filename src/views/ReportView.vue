<template>
  <div class="relative px-6 py-4">
    <div class="mx-auto max-w-6xl">
      <ReportIncomesSection />
      <div class="mt-6">
        <ReportSavingsSection />
      </div>
      <div class="mt-6">
        <ReportExpensesSection />
      </div>
      <div class="mt-6">
        <ReportGoalsSection />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTranslation } from '@/i18n'
import { useHeadMeta } from '@/composables/useHeadMeta'
import ReportIncomesSection from '@/components/report/ReportIncomesSection.vue'
import ReportSavingsSection from '@/components/report/ReportSavingsSection.vue'
import ReportExpensesSection from '@/components/report/ReportExpensesSection.vue'
import ReportGoalsSection from '@/components/report/ReportGoalsSection.vue'

const { t } = useTranslation()

// Set page metadata
useHeadMeta({
  title: () => t('page_title_report'),
  description: () => t('page_description_report')
})
</script>
