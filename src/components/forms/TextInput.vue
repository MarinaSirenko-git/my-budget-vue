<template>
  <div class="w-full">
    <div
      class="relative"
      :class="{
        'opacity-60 pointer-events-none': disabled,
      }"
    >
      <input
        :id="inputId"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        :maxlength="maxLength"
        :minlength="minLength"
        :pattern="pattern"
        :aria-invalid="!!error"
        :aria-describedby="error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined"
        class="w-full border rounded-xl px-4 py-3 text-sm transition-colors"
        :class="[
          error
            ? 'border-red-400 focus:ring-red-200'
            : 'border-gray-300 focus:ring-gray-200',
          'focus:outline-none focus:ring-2',
        ]"
        @input="handleInput"
        @focus="emitFocus"
        @blur="handleBlur"
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
import { ref } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: string
    type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search'
    placeholder?: string
    disabled?: boolean
    required?: boolean
    error?: string | null
    helperText?: string | null
    maxLength?: number
    minLength?: number
    pattern?: string
    validateOnBlur?: boolean
  }>(),
  {
    type: 'text',
    placeholder: '',
    disabled: false,
    required: false,
    error: null,
    helperText: null,
    maxLength: undefined,
    minLength: undefined,
    pattern: undefined,
    validateOnBlur: false,
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'focus', event: FocusEvent): void
  (e: 'blur', event: FocusEvent): void
  (e: 'validation', isValid: boolean, error: string | null): void
}>()

const inputId = ref(`text-input-${Math.random().toString(36).slice(2, 8)}`)

const validateInput = (value: string): { isValid: boolean; error: string | null } => {
  const trimmedValue = value.trim()

  // Required validation
  if (props.required && !trimmedValue) {
    return { isValid: false, error: 'This field is required' }
  }

  // Skip further validation if field is empty and not required
  if (!trimmedValue && !props.required) {
    return { isValid: true, error: null }
  }

  // Min length validation
  if (props.minLength && trimmedValue.length < props.minLength) {
    return {
      isValid: false,
      error: `Minimum length is ${props.minLength} characters`,
    }
  }

  // Max length validation
  if (props.maxLength && trimmedValue.length > props.maxLength) {
    return {
      isValid: false,
      error: `Maximum length is ${props.maxLength} characters`,
    }
  }

  // Type-specific validation
  if (props.type === 'email' && trimmedValue) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedValue)) {
      return { isValid: false, error: 'Please enter a valid email address' }
    }
  }

  if (props.type === 'url' && trimmedValue) {
    try {
      new URL(trimmedValue.startsWith('http') ? trimmedValue : `https://${trimmedValue}`)
    } catch {
      return { isValid: false, error: 'Please enter a valid URL' }
    }
  }

  // Pattern validation
  if (props.pattern && trimmedValue) {
    const regex = new RegExp(props.pattern)
    if (!regex.test(trimmedValue)) {
      return { isValid: false, error: 'Invalid format' }
    }
  }

  return { isValid: true, error: null }
}

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  const value = target.value

  // Apply maxLength limit if specified
  if (props.maxLength && value.length > props.maxLength) {
    target.value = value.slice(0, props.maxLength)
    emit('update:modelValue', target.value)
    return
  }

  emit('update:modelValue', value)
}

const handleBlur = (event: FocusEvent) => {
  emit('blur', event)

  if (props.validateOnBlur) {
    const target = event.target as HTMLInputElement
    const validation = validateInput(target.value)
    emit('validation', validation.isValid, validation.error)
  }
}

const emitFocus = (event: FocusEvent) => {
  emit('focus', event)
}
</script>
