<template>
  <Teleport to="body">
    <transition name="fade">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center px-4 sm:px-6"
        role="dialog"
        aria-modal="true"
        @keydown.esc.prevent="handleClose"
      >
        <div class="absolute inset-0 bg-black/40" @click="onBackdropClick"></div>

        <transition name="scale">
          <div
            v-if="modelValue"
            class="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
          >
            <div class="flex items-start justify-between px-5 py-4 border-b border-gray-100">
              <div class="space-y-1">
                <h3 class="text-lg font-semibold text-gray-900">
                  {{ title }}
                </h3>
                <p v-if="description" class="text-sm text-gray-500">
                  {{ description }}
                </p>
              </div>
              <button
                type="button"
                class="text-gray-400 hover:text-gray-600 focus:outline-none"
                aria-label="Close"
                @click="handleClose"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" stroke="currentColor" fill="none">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div class="px-5 py-4">
              <slot name="body" />
            </div>

            <div v-if="$slots.footer" class="px-5 py-4 border-t border-gray-100 bg-gray-50">
              <slot name="footer" />
            </div>
          </div>
        </transition>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue: boolean
    title?: string
    description?: string
    closeOnBackdrop?: boolean
  }>(),
  {
    title: '',
    description: '',
    closeOnBackdrop: true,
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'close'): void
  (e: 'open'): void
}>()

const handleClose = () => {
  emit('update:modelValue', false)
  emit('close')
}

const onBackdropClick = () => {
  if (!props.closeOnBackdrop) return
  handleClose()
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.scale-enter-active,
.scale-leave-active {
  transition: transform 0.15s ease, opacity 0.15s ease;
}
.scale-enter-from,
.scale-leave-to {
  transform: scale(0.97);
  opacity: 0;
}
</style>
