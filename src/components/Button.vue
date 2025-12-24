<template>
  <button
    type="button"
    :class="buttonClasses"
    :disabled="disabled"
    @click="handleClick"
  >
    <slot>{{ text }}</slot>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    text?: string
    disabled?: boolean
    variant?: 'primary' | 'secondary' | 'ghost'
  }>(),
  {
    text: '',
    disabled: false,
    variant: 'primary',
  }
)

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()

const buttonClasses = computed(() => {
  // Minimum 44x44px touch target for mobile accessibility
  const baseClasses = 'px-4 py-3 min-h-[44px] text-sm font-semibold rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 flex items-center justify-center'
  
  const variantClasses = {
    primary: 'bg-black text-white hover:bg-gray-900 focus:ring-black disabled:bg-gray-400 disabled:cursor-not-allowed',
    secondary: 'bg-white text-black border border-black hover:bg-gray-50 focus:ring-black disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed',
    ghost: 'text-black hover:bg-gray-100 focus:ring-gray-300 disabled:text-gray-400 disabled:cursor-not-allowed',
  }
  
  return `${baseClasses} ${variantClasses[props.variant]}`
})

const handleClick = (event: MouseEvent) => {
  if (!props.disabled) {
    emit('click', event)
  }
}
</script>
