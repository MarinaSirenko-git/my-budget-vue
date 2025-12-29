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
  distractionFree: false,
  autoDecimalMode: false, // Отключаем автоматическое добавление десятичных разрядов для предотвращения проблем на Android
  valueRange: {
    min: props.min,
    max: props.max,
  },
}

const { inputRef: _inputRef, setValue, setOptions } = useCurrencyInput(currencyOptions, false)

// Флаг для предотвращения циклических обновлений
let isUpdating = false
let lastEmittedValue: number | null = null

// Handle input changes
const handleInput = async () => {
  if (isUpdating || !_inputRef.value) return
  
  isUpdating = true
  
  try {
    // Даем библиотеке время на форматирование
    await nextTick()
    
    const inputElement = _inputRef.value as HTMLInputElement
    const rawValue = inputElement.value
    
    // Определяем десятичный разделитель в зависимости от локали
    const decimalSeparator = props.locale?.includes('ru') || props.locale?.includes('RU') ? ',' : '.'
    const thousandSeparator = decimalSeparator === ',' ? '.' : ','
    
    // Удаляем все символы кроме цифр и десятичного разделителя
    let cleanedValue = rawValue
      .replace(new RegExp(`[^\\d${decimalSeparator === ',' ? ',' : '.'}]`, 'g'), '')
      .replace(new RegExp(`\\${thousandSeparator}`, 'g'), '')
    
    // Заменяем локальный десятичный разделитель на точку для parseFloat
    if (decimalSeparator === ',') {
      cleanedValue = cleanedValue.replace(',', '.')
    }
    
    // Обрабатываем пустое значение или только разделитель
    if (cleanedValue === '' || cleanedValue === '.') {
      if (lastEmittedValue !== null) {
        lastEmittedValue = null
        emit('update:modelValue', null)
      }
      return
    }
    
    const numValue = parseFloat(cleanedValue)
    
    // Проверяем, что значение валидно и изменилось
    if (!isNaN(numValue) && numValue !== lastEmittedValue) {
      lastEmittedValue = numValue
      emit('update:modelValue', numValue)
    }
  } finally {
    // Используем setTimeout для сброса флага после завершения всех обновлений
    setTimeout(() => {
      isUpdating = false
    }, 0)
  }
}

// Watch for external changes to modelValue
watch(
  () => props.modelValue,
  (newValue) => {
    if (isUpdating) return
    
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
  emit('focus', event)
}

const handleBlur = (event: FocusEvent) => {
  // При потере фокуса финализируем значение
  if (_inputRef.value) {
    const inputElement = _inputRef.value as HTMLInputElement
    const rawValue = inputElement.value.trim()
    
    if (rawValue === '') {
      if (lastEmittedValue !== null) {
        lastEmittedValue = null
        emit('update:modelValue', null)
      }
    } else {
      handleInput()
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
