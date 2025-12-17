<template>
  <div class="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8">
    <!-- Emojis -->
    <div v-if="emojis && emojis.length > 0" class="text-6xl flex items-center justify-center gap-4">
      <span v-for="(emoji, index) in emojis" :key="index">{{ emoji }}</span>
    </div>

    <!-- Title and Subtitle -->
    <div class="space-y-3 max-w-md">
      <h1 v-if="title" class="text-2xl font-bold text-gray-900">
        {{ title }}
      </h1>
      <p v-if="subtitle" class="text-md text-gray-600">
        {{ subtitle }}
      </p>
    </div>

    <!-- Options Grid -->
    <div v-if="options && options.length > 0" :class="`grid ${gridColumnsClass} gap-3 max-w-2xl`">
      <button
        v-for="option in options"
        :key="option.id"
        class="w-full px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900 transition-colors text-sm font-medium"
        @click="handleOptionClick(option)"
      >
        {{ option.label }}
      </button>
    </div>

    <!-- Action Button -->
    <button
      v-if="actionButton"
      class="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-900 transition-colors text-sm font-medium"
      @click="handleActionClick"
    >
      {{ actionButton.label }}
    </button>

    <!-- Custom Content Slot -->
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface EmptyStateOption {
  id: string
  label: string
  [key: string]: unknown
}

export interface EmptyStateActionButton {
  label: string
  onClick: () => void
}

const props = withDefaults(
  defineProps<{
    emojis?: string[]
    title?: string
    subtitle?: string
    options?: EmptyStateOption[]
    actionButton?: EmptyStateActionButton
    columns?: number
  }>(),
  {
    emojis: () => [],
    title: '',
    subtitle: '',
    options: () => [],
    actionButton: undefined,
    columns: 3,
  }
)

// Compute grid columns class for Tailwind
const gridColumnsClass = computed(() => {
  const columnMap: Record<number, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6',
  }
  return columnMap[props.columns] || 'grid-cols-3'
})

const emit = defineEmits<{
  (e: 'option-click', option: EmptyStateOption): void
  (e: 'action-click'): void
}>()

const handleOptionClick = (option: EmptyStateOption) => {
  emit('option-click', option)
}

const handleActionClick = () => {
  if (props.actionButton?.onClick) {
    props.actionButton.onClick()
  }
  emit('action-click')
}
</script>
