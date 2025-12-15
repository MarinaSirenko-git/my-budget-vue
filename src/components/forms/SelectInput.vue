<template>
  <div ref="rootRef" class="w-full">
    <div
      class="relative"
      :class="{
        'opacity-60 pointer-events-none': disabled,
      }"
    >
      <button
        type="button"
        class="w-full border rounded-xl px-4 py-3 text-left flex items-center justify-between gap-2 transition-colors"
        :class="[
          error
            ? 'border-red-400 focus:ring-red-200'
            : 'border-gray-300 focus:ring-gray-200',
          'focus:outline-none focus:ring-2',
        ]"
        role="combobox"
        :aria-expanded="isOpen"
        :aria-controls="dropdownId"
        :aria-invalid="!!error"
        @click="toggleDropdown"
        @keydown="onTriggerKeydown"
        @focus="emitFocus"
        @blur="emitBlur"
      >
        <span class="truncate">
          {{ selectedOption?.label ?? placeholder }}
        </span>
        <svg
          class="w-4 h-4 flex-shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <div
        v-if="isOpen"
        :id="dropdownId"
        class="absolute mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-20 max-h-64 overflow-auto"
        role="listbox"
      >
        <div v-if="searchable" class="p-2 border-b border-gray-100">
          <input
            v-model="searchTerm"
            type="text"
            class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
            :placeholder="searchPlaceholder"
            @keydown.stop
          />
        </div>
        <ul>
          <li
            v-for="(option, index) in filteredOptions"
            :key="option.value"
            class="px-4 py-2 cursor-pointer flex items-center justify-between"
            :class="{
              'bg-gray-100': index === highlightedIndex,
              'text-gray-900': option.value === modelValue,
              'text-gray-700': option.value !== modelValue,
            }"
            role="option"
            :aria-selected="option.value === modelValue"
            @mouseenter="highlightedIndex = index"
            @mouseleave="highlightedIndex = -1"
            @click="selectOption(option)"
          >
            <span class="truncate">{{ option.label }}</span>
            <span
              v-if="option.value === modelValue"
              class="text-gray-500 text-xs ml-2"
            >
              ✓
            </span>
          </li>
          <li
            v-if="filteredOptions.length === 0"
            class="px-4 py-3 text-sm text-gray-500"
          >
            {{ emptyLabel }}
          </li>
        </ul>
      </div>
    </div>

    <p v-if="error" class="mt-2 text-sm text-red-600">
      {{ error }}
    </p>
    <p v-else-if="helperText" class="mt-2 text-sm text-gray-500">
      {{ helperText }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

export interface SelectOption {
  label: string
  value: string
}

const props = withDefaults(
  defineProps<{
    modelValue: string | null
    options: SelectOption[]
    placeholder?: string
    disabled?: boolean
    error?: string | null
    helperText?: string | null
    searchable?: boolean
    emptyLabel?: string
    searchPlaceholder?: string
  }>(),
  {
    placeholder: 'Select an option',
    disabled: false,
    error: null,
    helperText: null,
    searchable: false,
    emptyLabel: 'No options found',
    searchPlaceholder: 'Search...',
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | null): void
  (e: 'open'): void
  (e: 'close'): void
  (e: 'focus'): void
  (e: 'blur'): void
}>()

const isOpen = ref(false)
const highlightedIndex = ref(-1)
const searchTerm = ref('')
const dropdownId = `select-${Math.random().toString(36).slice(2, 8)}`
const rootRef = ref<HTMLElement | null>(null)

const filteredOptions = computed(() => {
  if (!props.searchable || !searchTerm.value.trim()) {
    return props.options
  }
  const term = searchTerm.value.toLowerCase()
  return props.options.filter(
    (opt) =>
      opt.label.toLowerCase().includes(term) ||
      opt.value.toLowerCase().includes(term)
  )
})

const selectedOption = computed(() =>
  props.options.find((opt) => opt.value === props.modelValue)
)

const openDropdown = () => {
  if (props.disabled || isOpen.value) return
  isOpen.value = true
  emit('open')
  // set initial highlight to selected or first
  const idx = filteredOptions.value.findIndex(
    (opt) => opt.value === props.modelValue
  )
  highlightedIndex.value = idx >= 0 ? idx : 0
}

const closeDropdown = () => {
  if (!isOpen.value) return
  isOpen.value = false
  highlightedIndex.value = -1
  searchTerm.value = ''
  emit('close')
}

const toggleDropdown = () => {
  if (isOpen.value) {
    closeDropdown()
  } else {
    openDropdown()
  }
}

const selectOption = (option: SelectOption) => {
  emit('update:modelValue', option.value)
  closeDropdown()
}

const onTriggerKeydown = (event: KeyboardEvent) => {
  if (props.disabled) return
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    if (!isOpen.value) {
      openDropdown()
      return
    }
    highlightedIndex.value = Math.min(
      highlightedIndex.value + 1,
      filteredOptions.value.length - 1
    )
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    if (!isOpen.value) {
      openDropdown()
      return
    }
    highlightedIndex.value = Math.max(highlightedIndex.value - 1, 0)
  } else if (event.key === 'Enter') {
    event.preventDefault()
    if (!isOpen.value) {
      openDropdown()
      return
    }
    const option = filteredOptions.value[highlightedIndex.value]
    if (option) selectOption(option)
  } else if (event.key === 'Escape') {
    event.preventDefault()
    closeDropdown()
  } else if (event.key === ' ') {
    // Space toggles
    event.preventDefault()
    toggleDropdown()
  }
}

const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as Node | null
  const root = rootRef.value
  if (root && target && !root.contains(target)) {
    closeDropdown()
  }
}

const emitFocus = () => emit('focus')
const emitBlur = () => emit('blur')

watch(
  () => props.options,
  () => {
    // Reset highlight if options change
    highlightedIndex.value = -1
  }
)

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleClickOutside)
})
</script>
