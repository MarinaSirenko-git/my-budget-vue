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
  distractionFree: true,
  autoDecimalMode: false,
  valueRange: {
    min: props.min,
    max: undefined,
  },
}

const { inputRef: _inputRef, setValue, setOptions } = useCurrencyInput(currencyOptions, false)

// Flag to prevent formatting during input
let isUpdating = false
let isFocused = false

// Handle input changes
const handleInput = async () => {
  if (isUpdating || !_inputRef.value || !isFocused) return
  
  isUpdating = true
  
  try {
    await nextTick()
    
    const inputElement = _inputRef.value as HTMLInputElement
    const rawValue = inputElement.value
    
    // Parse value manually without formatting
    const decimalSeparator = props.locale?.includes('ru') || props.locale?.includes('RU') ? ',' : '.'
    const thousandSeparator = decimalSeparator === ',' ? '.' : ','
    
    let cleanedValue = rawValue
      .replace(new RegExp(`[^\\d${decimalSeparator === ',' ? ',' : '.'}]`, 'g'), '')
      .replace(new RegExp(`\\${thousandSeparator}`, 'g'), '')
    
    if (decimalSeparator === ',') {
      cleanedValue = cleanedValue.replace(',', '.')
    }
    
    if (cleanedValue === '' || cleanedValue === '.') {
      emit('update:modelValue', null)
      return
    }
    
    const numValue = parseFloat(cleanedValue)
    
    if (!isNaN(numValue)) {
      // Emit value but DON'T call setValue to prevent formatting
      emit('update:modelValue', numValue)
    }
  } finally {
    setTimeout(() => {
      isUpdating = false
    }, 0)
  }
}

// Watch for external changes to modelValue
watch(
  () => props.modelValue,
  (newValue) => {
    // Don't format if user is currently typing
    if (isUpdating || isFocused) return
    
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
  isFocused = true
  
  // On focus, show value without formatting for free editing
  if (_inputRef.value && props.modelValue !== null) {
    const inputElement = _inputRef.value as HTMLInputElement
    const decimalSeparator = props.locale?.includes('ru') || props.locale?.includes('RU') ? ',' : '.'
    const valueStr = props.modelValue.toString().replace('.', decimalSeparator)
    inputElement.value = valueStr
  }
  
  emit('focus', event)
}

const handleBlur = (event: FocusEvent) => {
  // Prevent race condition with handleInput
  if (isUpdating) {
    // Wait for handleInput to finish
    setTimeout(() => handleBlur(event), 10)
    return
  }
  
  isFocused = false
  
  // Apply formatting only on blur
  if (_inputRef.value) {
    const inputElement = _inputRef.value as HTMLInputElement
    const rawValue = inputElement.value.trim()
    
    if (rawValue === '') {
      emit('update:modelValue', null)
      setValue(null)
    } else {
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
        emit('update:modelValue', numValue)
        // Now apply formatting through library
        setValue(numValue)
      }
    }
  }
  
  emit('blur', event)
}

onMounted(() => {
  if (props.modelValue !== null && props.modelValue !== undefined) {
    setValue(props.modelValue)
  }
})
</script>
