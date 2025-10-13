<script setup lang="ts">
import ResultsList from '@quick-search-components/results/IndexComponent.vue'
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
import SearchTermInputRow from './SearchTermInputRow.vue'

const { searchTerm, foundItems, hasSearchedOnce } = storeToRefs(useSearchStore())

const modalRef = useTemplateRef<HTMLElement>('modalRef')
const searchTermWrapperComponentRef = useTemplateRef<HTMLElement>('searchTermWrapperComponentRef')

const { closeModal, isModalVisible } = useDisplay()
const { position, hasMoved } = useMove(modalRef, searchTermWrapperComponentRef, hasSearchedOnce)
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
      <div ref="searchTermWrapperComponentRef">
        <SearchTermInputRow />
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
