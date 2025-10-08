<script setup lang="ts">
import InputElement from '@quick-search-components/search-modal/InputElement.vue'
import ResultsList from '@quick-search-components/results/IndexComponent.vue'
import MagnifyingGlass from '@vue-components/icons/MagnifyingGlass.vue'
import { useSearchStore } from '@vue-src/stores/quick-search/search'
import { storeToRefs } from 'pinia'
import { onClickOutside } from '@vueuse/core'
import { provide, useTemplateRef } from 'vue'
import { useMove } from './useMove'
import { useDisplay } from './useDisplay'
import { useKeyboardSelection } from './useKeyboardSelection'
import { KEYBOARD_SELECTED_ITEM_SYMBOL } from './constants'
import LoadingSpinner from '../LoadingSpinner.vue'
import { useAddAssetToCanvasHandling } from './useAddAssetToCanvasHandling'
import RegularFadeTransition from '@vue-src/components/RegularFadeTransition.vue'

const { searchTerm, foundItems, isSearching, hasSearchedOnce } = storeToRefs(useSearchStore())

const modalRef = useTemplateRef<HTMLElement>('modalRef')
const searchTermWrapperRef = useTemplateRef<HTMLElement>('searchTermWrapperRef')

const { closeModal, isModalVisible } = useDisplay()
const { position, hasMoved } = useMove(modalRef, searchTermWrapperRef, hasSearchedOnce)
const { selectedItem } = useKeyboardSelection(isModalVisible, foundItems, searchTerm)
const { entireModalLoadingState } = useAddAssetToCanvasHandling({ addedAssetToCanvas: closeModal })

provide(KEYBOARD_SELECTED_ITEM_SYMBOL, selectedItem)

onClickOutside(modalRef, closeModal)
</script>

<template>
  <RegularFadeTransition>
    <dialog
      ref="modalRef"
      :style="position"
      :class="['quick-search-modal', { 'default-position': !hasSearchedOnce && !hasMoved }]"
      closedby="any"
      v-show="isModalVisible"
      open
    >
      <div ref="searchTermWrapperRef" class="search-term-wrapper" v-auto-animate>
        <LoadingSpinner :class="['inline-loading-indicator', { 'non-visible': !isSearching }]" />
        <MagnifyingGlass :class="['magnifying-glass-icon', { 'non-visible': isSearching }]" />
        <InputElement
          v-model="searchTerm"
          placeholder="Quick Search"
          class="search-term-input"
          data-exclude-from-drag-triggers
        />
      </div>
      <ResultsList :items="foundItems" class="results-list" />
      <RegularFadeTransition>
        <div v-show="entireModalLoadingState" class="loading-state">
          <LoadingSpinner />
        </div>
      </RegularFadeTransition>
    </dialog>
  </RegularFadeTransition>
</template>

<style scoped lang="scss">
.quick-search-modal {
  position: fixed;
  z-index: 999;
  width: 400px;
  margin: unset;
  padding: 0;
  border: 1px solid #493a50;
  outline: none;
  box-shadow: 0 0 20px #000;
  border-radius: 6px;
  backdrop-filter: blur(6px);
  pointer-events: auto;

  &.default-position {
    transform: translate(-50%, -50%);
    top: 50%;
    left: 50%;
  }
}

.quick-search-modal,
.results-list {
  background: rgba(48, 40, 49, 0.65);
}

.search-term-wrapper {
  cursor: move;
  padding: 0.4rem 0.9rem;
  font-size: 1rem;
}

.search-term-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  gap: 7px;
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

.results-list {
  width: 100%;
  max-height: 250px;
}

.loading-state {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 6px;
}
</style>
