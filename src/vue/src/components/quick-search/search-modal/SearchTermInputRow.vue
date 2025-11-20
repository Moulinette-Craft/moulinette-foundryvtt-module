<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useSearchStore } from '@vue-src/stores/quick-search/search'
import LoadingSpinner from '../LoadingSpinner.vue'
import MagnifyingGlass from '@vue-src/components/icons/MagnifyingGlass.vue'
import InputElement from './InputElement.vue'
import { inject, nextTick, useTemplateRef, watchEffect } from 'vue'
import { IS_MODAL_VISIBLE } from './constants'

const { searchTerm, isSearching } = storeToRefs(useSearchStore())

const inputRef = useTemplateRef<HTMLInputElement>('inputRef')
const keyboardSelectedItem = inject(IS_MODAL_VISIBLE)

watchEffect(() => {
  if (keyboardSelectedItem?.value) {
    nextTick(() => {
      inputRef.value?.focus()
    })
  }
})
</script>

<template>
  <div class="search-term-wrapper" v-auto-animate>
    <LoadingSpinner :class="['inline-loading-indicator', { 'non-visible': !isSearching }]" />
    <MagnifyingGlass :class="['magnifying-glass-icon', { 'non-visible': isSearching }]" />
    <InputElement
      v-model="searchTerm"
      ref="inputRef"
      placeholder="Moulinette Quick Search"
      class="search-term-input"
      data-exclude-from-drag-triggers
    />
  </div>
</template>

<style lang="scss" scoped>
.search-term-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 1rem;
  cursor: move;
}

.magnifying-glass-icon,
.inline-loading-indicator {
  transition: all 0.2s;
  min-width: 18px;
  max-width: 18px;
  min-height: 18px;
  max-height: 18px;
}

.magnifying-glass-icon {
  color: rgba(239, 230, 216, 0.5);
}

.inline-loading-indicator {
  position: absolute;
  top: 12px;
  left: 13px;
}

.non-visible {
  opacity: 0;
}

.search-term-input {
  width: 100%;
}
</style>
