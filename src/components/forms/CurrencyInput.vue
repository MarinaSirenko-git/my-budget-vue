<template>
  <div class="w-full">
    <div
      class="relative"
      :class="{
        'opacity-60 pointer-events-none': disabled,
      }"
    >
      <input
        ref="_inputRef"
        :id="inputId"
        type="text"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        :aria-invalid="!!error"
        :aria-describedby="error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined"
        class="w-full border rounded-xl px-4 py-3 text-sm transition-colors"
        :class="[
          error
            ? 'border-red-400 focus:ring-red-200'
            : 'border-gray-300 focus:ring-gray-200',
          'focus:outline-none focus:ring-2',
        ]"
        @focus="emitFocus"
        @blur="emitBlur"
        @input="handleInput"
      />
    </div>

    <p
      v-if="error"
      :id="`${inputId}-error`"
      class="mt-2 text-sm text-red-600"
      role="alert"
    >
      {{ error }}
    </p>
    <p
      v-else-if="helperText"
      :id="`${inputId}-helper`"
      class="mt-2 text-sm text-gray-500"
    >
      {{ helperText }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useCurrencyInput } from 'vue-currency-input'

const props = withDefaults(
  defineProps<{
    modelValue: number | null
    placeholder?: string
    disabled?: boolean
    required?: boolean
    error?: string | null
    helperText?: string | null
    currency?: string
    locale?: string
    min?: number
  }>(),
  {
    placeholder: '',
    disabled: false,
    required: false,
    error: null,
    helperText: null,
    currency: undefined,
    locale: undefined,
    min: 0.01,
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: number | null): void
  (e: 'focus', event: FocusEvent): void
  (e: 'blur', event: FocusEvent): void
  (e: 'change', event: Event): void
}>()

const inputId = ref(`currency-input-${Math.random().toString(36).slice(2, 8)}`)

// Currency input options
const currencyOptions = {
  currency: props.currency || 'USD',
  locale: props.locale,
  valueAsInteger: false,
  precision: 2,
  distractionFree: false,
  autoDecimalMode: true,
  valueRange: {
    min: props.min,
    max: undefined,
  },
}

const { inputRef: _inputRef, setValue, setOptions } = useCurrencyInput(currencyOptions, false)

// Handle input changes
const handleInput = () => {
  if (_inputRef.value) {
    const inputElement = _inputRef.value as HTMLInputElement
    // Get the raw value and convert to number
    const rawValue = inputElement.value.replace(/[^\d.-]/g, '')
    const numValue = rawValue ? parseFloat(rawValue) : null
    emit('update:modelValue', numValue)
  }
}

// Watch for external changes to modelValue
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue !== null && newValue !== undefined) {
      setValue(newValue)
    } else if (newValue === null) {
      setValue(null)
    }
  },
  { immediate: true }
)

// Watch for options changes
watch(
  () => [props.currency, props.locale, props.min],
  () => {
    setOptions({
      ...currencyOptions,
      currency: props.currency || 'USD',
      locale: props.locale,
      valueRange: {
        min: props.min,
        max: undefined,
      },
    })
  }
)

const emitFocus = (event: FocusEvent) => {
  emit('focus', event)
}

const emitBlur = (event: FocusEvent) => {
  emit('blur', event)
}

onMounted(() => {
  if (props.modelValue !== null && props.modelValue !== undefined) {
    setValue(props.modelValue)
  }
})
</script>

