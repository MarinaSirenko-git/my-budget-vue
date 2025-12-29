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
        inputmode="decimal"
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
        @blur="handleBlur"
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
import { ref, watch, onMounted, nextTick } from 'vue'
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
    max?: number
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
    max: undefined,
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
  distractionFree: true, // Enable distraction-free mode to prevent automatic formatting during input
  autoDecimalMode: false, // Disable automatic decimal places addition to prevent issues on Android
  valueRange: {
    min: props.min,
    max: props.max,
  },
}

// Use the library only for formatting on blur, not for managing input
const { inputRef: _inputRef, setValue, setOptions } = useCurrencyInput(currencyOptions, false)

// Flag to prevent circular updates
let isUpdating = false
let lastEmittedValue: number | null = null
let isFocused = false

// Handle input changes
const handleInput = async () => {
  if (isUpdating || !_inputRef.value || !isFocused) return
  
  isUpdating = true
  
  try {
    // During input, don't let the library format the value
    // Read the value directly from input and parse it manually
    await nextTick()
    
    const inputElement = _inputRef.value as HTMLInputElement
    let rawValue = inputElement.value
    
    // Determine decimal separator based on locale
    const decimalSeparator = props.locale?.includes('ru') || props.locale?.includes('RU') ? ',' : '.'
    const thousandSeparator = decimalSeparator === ',' ? '.' : ','
    
    // Remove all characters except digits and decimal separator
    let cleanedValue = rawValue
      .replace(new RegExp(`[^\\d${decimalSeparator === ',' ? ',' : '.'}]`, 'g'), '')
      .replace(new RegExp(`\\${thousandSeparator}`, 'g'), '')
    
    // Replace locale decimal separator with dot for parseFloat
    if (decimalSeparator === ',') {
      cleanedValue = cleanedValue.replace(',', '.')
    }
    
    // Handle empty value or separator only
    if (cleanedValue === '' || cleanedValue === '.') {
      if (lastEmittedValue !== null) {
        lastEmittedValue = null
        emit('update:modelValue', null)
      }
      // During input, don't format value through the library
      return
    }
    
    const numValue = parseFloat(cleanedValue)
    
    // Check that the value is valid and has changed
    if (!isNaN(numValue) && numValue !== lastEmittedValue) {
      lastEmittedValue = numValue
      emit('update:modelValue', numValue)
      
      // During input, do NOT call setValue to prevent the library from formatting the value
      // This prevents automatic addition of "00" on mobile devices
      // The value remains as is in the input, formatting will be applied only on blur
    }
  } finally {
    // Use setTimeout to reset the flag after all updates are complete
    setTimeout(() => {
      isUpdating = false
    }, 0)
  }
}

// Watch for external changes to modelValue
watch(
  () => props.modelValue,
  (newValue) => {
    if (isUpdating || isFocused) return
    
    if (newValue !== null && newValue !== undefined) {
      lastEmittedValue = newValue
      setValue(newValue)
    } else if (newValue === null) {
      lastEmittedValue = null
      setValue(null)
    }
  },
  { immediate: true }
)

// Watch for options changes
watch(
  () => [props.currency, props.locale, props.min, props.max],
  () => {
    setOptions({
      ...currencyOptions,
      currency: props.currency || 'USD',
      locale: props.locale,
      valueRange: {
        min: props.min,
        max: props.max,
      },
    })
  }
)

const emitFocus = (event: FocusEvent) => {
  isFocused = true
  
  // On focus, save the current value without formatting for free editing
  // This prevents issues with automatic formatting on mobile devices
  if (_inputRef.value && lastEmittedValue !== null) {
    const inputElement = _inputRef.value as HTMLInputElement
    // Save numeric value as string without formatting
    // This allows the user to edit the value freely
    const decimalSeparator = props.locale?.includes('ru') || props.locale?.includes('RU') ? ',' : '.'
    const valueStr = lastEmittedValue.toString().replace('.', decimalSeparator)
    inputElement.value = valueStr
  }
  
  emit('focus', event)
}

const handleBlur = (event: FocusEvent) => {
  isFocused = false
  
  // On blur, finalize the value and apply formatting
  if (_inputRef.value) {
    const inputElement = _inputRef.value as HTMLInputElement
    const rawValue = inputElement.value.trim()
    
    if (rawValue === '') {
      if (lastEmittedValue !== null) {
        lastEmittedValue = null
        emit('update:modelValue', null)
        setValue(null)
      }
    } else {
      // Apply formatting through the library on blur
      const decimalSeparator = props.locale?.includes('ru') || props.locale?.includes('RU') ? ',' : '.'
      const thousandSeparator = decimalSeparator === ',' ? '.' : ','
      
      let cleanedValue = rawValue
        .replace(new RegExp(`[^\\d${decimalSeparator === ',' ? ',' : '.'}]`, 'g'), '')
        .replace(new RegExp(`\\${thousandSeparator}`, 'g'), '')
      
      if (decimalSeparator === ',') {
        cleanedValue = cleanedValue.replace(',', '.')
      }
      
      const numValue = parseFloat(cleanedValue)
      if (!isNaN(numValue)) {
        lastEmittedValue = numValue
        emit('update:modelValue', numValue)
        // Apply library formatting only on blur
        setValue(numValue)
      }
    }
  }
  
  emit('blur', event)
}

onMounted(() => {
  if (props.modelValue !== null && props.modelValue !== undefined) {
    lastEmittedValue = props.modelValue
    setValue(props.modelValue)
  }
})
</script>
