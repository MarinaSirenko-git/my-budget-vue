<template>
  <table class="w-full border-collapse border border-black">
    <thead>
      <tr class="border-b border-black">
        <th
          v-for="column in columns"
          :key="column.key"
          :ref="column.key === currencyColumnKey ? (el) => { if (el) currencyHeaderRef = el as HTMLElement } : undefined"
          class="border-r border-black px-4 py-3 text-left text-sm font-medium text-black bg-white"
          :class="{
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
                <span class="text-sm font-medium">{{ props.displayBaseCurrency || '—' }}</span>
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
            
            <!-- Currency Dropdown -->
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
          class="border-r border-black px-4 py-3 text-sm text-black bg-white"
          :class="{
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
  // Currency dropdown props
  currencyColumnKey?: string
  showCurrencyDropdown?: boolean
  currencyOptions?: CurrencyOption[]
  displayBaseCurrency?: CurrencyCode | null
}

const props = withDefaults(defineProps<Props>(), {
  rowKey: 'id',
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
const currencyDropdownRef = ref<HTMLElement | null>(null)
const currencyDropdownStyle = ref<{ top: string; left: string; width: string } | null>(null)

const toggleCurrencyDropdown = async () => {
  const wasOpen = isCurrencyDropdownOpen.value
  isCurrencyDropdownOpen.value = !isCurrencyDropdownOpen.value
  
  if (isCurrencyDropdownOpen.value && !wasOpen) {
    // Set initial position immediately to make dropdown visible
    if (currencyHeaderRef.value) {
      const headerRect = currencyHeaderRef.value.getBoundingClientRect()
      currencyDropdownStyle.value = {
        top: `${headerRect.bottom + 4}px`,
        left: `${headerRect.left}px`,
        width: `${headerRect.width}px`,
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
  if (!currencyHeaderRef.value || !currencyDropdownRef.value) {
    // Retry if elements are not ready yet
    requestAnimationFrame(() => {
      if (currencyHeaderRef.value && currencyDropdownRef.value) {
        updateCurrencyDropdownPosition()
      }
    })
    return
  }

  const headerRect = currencyHeaderRef.value.getBoundingClientRect()
  const dropdownRect = currencyDropdownRef.value.getBoundingClientRect()
  
  // Calculate position
  let top = headerRect.bottom + 4
  let left = headerRect.left
  let width = headerRect.width

  // Check if dropdown would overflow bottom of viewport
  const spaceBelow = window.innerHeight - headerRect.bottom
  const spaceAbove = headerRect.top
  
  // If not enough space below but more space above, show above
  // Use estimated height if dropdownRect.height is 0 (not yet rendered)
  const estimatedHeight = dropdownRect.height || 200
  if (spaceBelow < estimatedHeight && spaceAbove > spaceBelow) {
    top = headerRect.top - estimatedHeight - 4
    // Ensure it doesn't go above viewport
    if (top < 0) {
      top = headerRect.bottom + 4
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
  const dropdown = currencyDropdownRef.value
  
  if (
    header &&
    dropdown &&
    target &&
    !header.contains(target) &&
    !dropdown.contains(target)
  ) {
    isCurrencyDropdownOpen.value = false
    currencyDropdownStyle.value = null
  }
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
