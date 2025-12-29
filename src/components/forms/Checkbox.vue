<template>
  <div class="flex items-center gap-2">
    <input
      :id="inputId"
      v-model="checked"
      type="checkbox"
      class="w-4 h-4 border-2 border-black rounded-sm bg-white checked:bg-black checked:border-black focus:ring-2 focus:ring-black focus:ring-offset-0 cursor-pointer appearance-none relative checked:after:content-['✓'] checked:after:text-white checked:after:text-xs checked:after:font-bold checked:after:absolute checked:after:inset-0 checked:after:flex checked:after:items-center checked:after:justify-center"
    />
    <label :for="inputId" class="text-sm font-medium text-gray-900 cursor-pointer">
      <slot>{{ label }}</slot>
    </label>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  modelValue: boolean
  label?: string
  id?: string
}

const props = withDefaults(defineProps<Props>(), {
  label: '',
  id: undefined,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const inputId = computed(() => {
  return props.id || `checkbox-${Math.random().toString(36).substr(2, 9)}`
})

const checked = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})
</script>


