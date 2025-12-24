<template>
  <div class="w-full">
    <!-- Currency Dropdown Header (Mobile) -->
    <div
      v-if="showCurrencyDropdown && currencyColumnKey"
      class="md:hidden mb-4 flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
    >
      <span class="text-sm font-medium text-gray-700">
        {{ getCurrencyColumnLabel() }}
      </span>
      <button
        type="button"
        ref="mobileCurrencyButtonRef"
        class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        @click="toggleCurrencyDropdown"
      >
        <span>{{ props.displayBaseCurrency || '—' }}</span>
        <svg
          class="w-4 h-4 transition-transform"
          :class="{ 'rotate-180': isCurrencyDropdownOpen }"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
    </div>

    <!-- Mobile Card View -->
    <div class="md:hidden space-y-3">
      <div
        v-for="row in data"
        :key="getRowKey(row)"
        class="bg-white border border-gray-200 rounded-lg p-4 space-y-3"
      >
        <div
          v-for="column in columns"
          :key="column.key"
          class="flex flex-col"
          :class="{
            'flex-row justify-between items-center': column.key === 'actions',
          }"
        >
          <span
            v-if="column.key !== 'actions'"
            class="text-xs font-medium text-gray-500 mb-1"
          >
            {{ column.label }}
          </span>
          <div
            :class="{
              'text-sm text-gray-900': column.key !== 'actions',
            }"
          >
            <!-- Custom cell renderer via slot -->
            <slot
              :name="`cell-${column.key}`"
              :row="row"
              :column="column"
              :value="row[column.key]"
            >
              <!-- Default cell renderer -->
              {{ formatCellValue(row, column) }}
            </slot>
          </div>
        </div>
      </div>
    </div>

    <!-- Desktop Table View -->
    <div class="hidden md:block overflow-x-auto">
      <table class="w-full border-collapse border border-black">
        <thead>
          <tr class="border-b border-black">
            <th
              v-for="column in columns"
              :key="column.key"
              :ref="column.key === currencyColumnKey ? (el) => { if (el) currencyHeaderRef = el as HTMLElement } : undefined"
              class="border-r border-black text-left font-medium text-black bg-white"
              :class="{
                'px-4 py-3 text-sm': size === 'default',
                'px-2 py-1 text-xs': size === 'xs',
                'border-black': column === columns[columns.length - 1],
                'relative': column.key === currencyColumnKey && showCurrencyDropdown,
              }"
            >
              <!-- Regular column header -->
              <template v-if="column.key !== currencyColumnKey || !showCurrencyDropdown">
                {{ column.label }}
              </template>

              <!-- Currency column header with dropdown -->
              <template v-else>
                <div class="flex items-center justify-between gap-2">
                  <span>{{ column.label }}</span>
                  <button
                    type="button"
                    class="flex items-center gap-1 hover:opacity-70 transition-opacity"
                    @click="toggleCurrencyDropdown"
                  >
                    <span class="font-medium" :class="size === 'xs' ? 'text-xs' : 'text-sm'">{{ props.displayBaseCurrency || '—' }}</span>
                    <svg
                      class="w-4 h-4 transition-transform"
                      :class="{ 'rotate-180': isCurrencyDropdownOpen }"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                </div>
              </template>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in data"
            :key="getRowKey(row)"
            class="border-b border-black"
          >
            <td
              v-for="column in columns"
              :key="column.key"
              class="border-r border-black text-black bg-white"
              :class="{
                'px-4 py-3 text-sm': size === 'default',
                'px-2 py-1 text-xs': size === 'xs',
                'border-black': column === columns[columns.length - 1],
              }"
            >
              <!-- Custom cell renderer via slot -->
              <slot
                :name="`cell-${column.key}`"
                :row="row"
                :column="column"
                :value="row[column.key]"
              >
                <!-- Default cell renderer -->
                {{ formatCellValue(row, column) }}
              </slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Currency Dropdown (shared for both views) -->
    <Teleport to="body">
      <div
        v-if="isCurrencyDropdownOpen"
        ref="currencyDropdownRef"
        class="fixed bg-white border border-gray-200 rounded-xl shadow-lg z-[60] max-h-64 overflow-auto"
        :style="currencyDropdownStyle"
      >
        <ul>
          <li
            v-for="option in currencyOptions"
            :key="option.value"
            class="px-4 py-2 cursor-pointer flex items-center justify-between hover:bg-gray-100 transition-colors"
            :class="{
              'bg-gray-50': option.value === props.displayBaseCurrency,
            }"
            @click="selectCurrency(option.value)"
          >
            <span class="truncate">{{ option.label }}</span>
            <span
              v-if="option.value === props.displayBaseCurrency"
              class="text-gray-500 text-xs ml-2"
            >
              ✓
            </span>
          </li>
        </ul>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { Teleport } from 'vue'
import type { CurrencyCode } from '@/constants/currency'

export interface TableColumn {
  key: string
  label: string
  formatter?: (value: any, row: any) => string
}

export interface CurrencyOption {
  label: string
  value: CurrencyCode
}

interface Props {
  columns: TableColumn[]
  data: any[]
  rowKey?: string | ((row: any) => string)
  size?: 'default' | 'xs'
  // Currency dropdown props
  currencyColumnKey?: string
  showCurrencyDropdown?: boolean
  currencyOptions?: CurrencyOption[]
  displayBaseCurrency?: CurrencyCode | null
}

const props = withDefaults(defineProps<Props>(), {
  rowKey: 'id',
  size: 'default',
  currencyColumnKey: undefined,
  showCurrencyDropdown: false,
  currencyOptions: () => [],
  displayBaseCurrency: null,
})

const emit = defineEmits<{
  'update:displayBaseCurrency': [value: CurrencyCode]
  'currency-change': [value: CurrencyCode]
}>()

// Currency dropdown state
const isCurrencyDropdownOpen = ref(false)
const currencyHeaderRef = ref<HTMLElement | null>(null)
const mobileCurrencyButtonRef = ref<HTMLElement | null>(null)
const currencyDropdownRef = ref<HTMLElement | null>(null)
const currencyDropdownStyle = ref<{ top: string; left: string; width: string } | null>(null)

const toggleCurrencyDropdown = async () => {
  const wasOpen = isCurrencyDropdownOpen.value
  isCurrencyDropdownOpen.value = !isCurrencyDropdownOpen.value
  
  if (isCurrencyDropdownOpen.value && !wasOpen) {
    // Determine which button triggered (mobile or desktop)
    const triggerElement = mobileCurrencyButtonRef.value || currencyHeaderRef.value
    
    if (triggerElement) {
      const rect = triggerElement.getBoundingClientRect()
      currencyDropdownStyle.value = {
        top: `${rect.bottom + 4}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
      }
    }
    
    // Wait for DOM to update and dropdown to be rendered
    await nextTick()
    // Use requestAnimationFrame to ensure the element is fully rendered, then recalculate position
    requestAnimationFrame(() => {
      updateCurrencyDropdownPosition()
    })
  } else if (!isCurrencyDropdownOpen.value) {
    currencyDropdownStyle.value = null
  }
}

const updateCurrencyDropdownPosition = () => {
  // Use mobile button if available, otherwise desktop header
  const triggerElement = mobileCurrencyButtonRef.value || currencyHeaderRef.value
  const dropdown = currencyDropdownRef.value
  
  // Check if refs exist and are DOM elements
  if (!triggerElement || !dropdown || 
      !(triggerElement instanceof HTMLElement) || 
      !(dropdown instanceof HTMLElement)) {
    // Retry if elements are not ready yet
    requestAnimationFrame(() => {
      updateCurrencyDropdownPosition()
    })
    return
  }

  const triggerRect = triggerElement.getBoundingClientRect()
  const dropdownRect = dropdown.getBoundingClientRect()
  
  // Calculate position
  let top = triggerRect.bottom + 4
  let left = triggerRect.left
  let width = triggerRect.width

  // Check if dropdown would overflow bottom of viewport
  const spaceBelow = window.innerHeight - triggerRect.bottom
  const spaceAbove = triggerRect.top
  
  // If not enough space below but more space above, show above
  // Use estimated height if dropdownRect.height is 0 (not yet rendered)
  const estimatedHeight = dropdownRect.height || 200
  if (spaceBelow < estimatedHeight && spaceAbove > spaceBelow) {
    top = triggerRect.top - estimatedHeight - 4
    // Ensure it doesn't go above viewport
    if (top < 0) {
      top = triggerRect.bottom + 4
    }
  }

  // Ensure dropdown doesn't overflow viewport horizontally
  if (left + width > window.innerWidth) {
    left = window.innerWidth - width - 16
  }
  if (left < 16) {
    left = 16
  }

  currencyDropdownStyle.value = {
    top: `${top}px`,
    left: `${left}px`,
    width: `${width}px`,
  }
}

const selectCurrency = (currency: CurrencyCode) => {
  emit('update:displayBaseCurrency', currency)
  emit('currency-change', currency)
  isCurrencyDropdownOpen.value = false
  currencyDropdownStyle.value = null
}

const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as Node | null
  const header = currencyHeaderRef.value
  const mobileButton = mobileCurrencyButtonRef.value
  const dropdown = currencyDropdownRef.value
  
  if (
    dropdown &&
    dropdown instanceof HTMLElement &&
    target &&
    !dropdown.contains(target) &&
    !(header && header instanceof HTMLElement && header.contains(target)) &&
    !(mobileButton && mobileButton instanceof HTMLElement && mobileButton.contains(target))
  ) {
    isCurrencyDropdownOpen.value = false
    currencyDropdownStyle.value = null
  }
}

// Get currency column label
const getCurrencyColumnLabel = (): string => {
  const currencyColumn = props.columns.find(col => col.key === props.currencyColumnKey)
  return currencyColumn?.label || 'Currency'
}

const handleResize = () => {
  if (isCurrencyDropdownOpen.value) {
    updateCurrencyDropdownPosition()
  }
}

onMounted(() => {
  if (props.showCurrencyDropdown) {
    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleResize, true)
  }
})

onBeforeUnmount(() => {
  if (props.showCurrencyDropdown) {
    document.removeEventListener('mousedown', handleClickOutside)
    window.removeEventListener('resize', handleResize)
    window.removeEventListener('scroll', handleResize, true)
  }
})

// Get row key
const getRowKey = (row: any): string => {
  if (typeof props.rowKey === 'function') {
    return props.rowKey(row)
  }
  return row[props.rowKey] || ''
}

// Format cell value
const formatCellValue = (row: any, column: TableColumn): string => {
  const value = row[column.key]
  if (column.formatter) {
    return column.formatter(value, row)
  }
  return value != null ? String(value) : ''
}
</script>
