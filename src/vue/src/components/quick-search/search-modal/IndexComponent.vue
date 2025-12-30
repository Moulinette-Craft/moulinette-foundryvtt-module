<script setup lang="ts">
import ResultsList from '@quick-search-components/results/IndexComponent.vue'
import { useSearchStore } from '@vue-src/stores/quick-search/search'
import { storeToRefs } from 'pinia'
import { onClickOutside } from '@vueuse/core'
import { provide, ref, shallowRef, useTemplateRef, watch } from 'vue'
import { useMove } from './useMove'
import { useDisplay } from './useDisplay'
import { useKeyboardSelection } from './useKeyboardSelection'
import { useDisplay as useSelectionPreviewDisplay } from '../results/selection-preview/useDisplay'
import { IS_MODAL_VISIBLE, KEYBOARD_SELECTED_ITEM_SYMBOL } from './constants'
import LoadingSpinner from '../LoadingSpinner.vue'
import { useAddAssetToCanvasHandling } from './useAddAssetToCanvasHandling'
import RegularFadeTransition from '@vue-src/components/RegularFadeTransition.vue'
import SearchTermInputRow from './SearchTermInputRow.vue'
import SelectionPreview from '../results/selection-preview/IndexComponent.vue'
import type { ItemInTheFocusType } from '@vue-src/types/quick-search'
import SearchCategories from './SearchCategories.vue'
import { QUICK_SEARCH_MODAL_STOP_ALL_AUDIO } from '@root/ts/constants'

const { searchTerm, activeSearchCategory, activeSearchCategoryFoundItems, hasSearchedOnce } =
  storeToRefs(useSearchStore())

const itemInTheFocus = ref<ItemInTheFocusType>()
const selectionPreviewElementBounding = shallowRef()

const modalRef = useTemplateRef<HTMLElement>('modalRef')
const draggableAreaWrapperRef = useTemplateRef<HTMLElement>('draggableAreaWrapperRef')

const { closeModal, isModalVisible } = useDisplay()
const { position, hasMoved } = useMove(modalRef, draggableAreaWrapperRef, hasSearchedOnce)
const { selectedItem } = useKeyboardSelection(
  isModalVisible,
  activeSearchCategoryFoundItems,
  searchTerm,
  itemInTheFocus,
  activeSearchCategory,
)
const { entireModalLoadingState } = useAddAssetToCanvasHandling({ addedAssetToCanvas: closeModal })
const { state: selectionPreviewState, position: selectionPreviewPosition } =
  useSelectionPreviewDisplay(
    modalRef,
    itemInTheFocus,
    selectionPreviewElementBounding,
    activeSearchCategory,
    isModalVisible,
    searchTerm,
  )

provide(KEYBOARD_SELECTED_ITEM_SYMBOL, selectedItem)
provide(IS_MODAL_VISIBLE, isModalVisible)

onClickOutside(modalRef, closeModal)

watch(
  () => [activeSearchCategory.value, isModalVisible.value, searchTerm.value],
  () => window.dispatchEvent(new CustomEvent(QUICK_SEARCH_MODAL_STOP_ALL_AUDIO)),
)
</script>

<template>
  <RegularFadeTransition>
    <dialog
      ref="modalRef"
      :style="position"
      :class="[$style['quick-search-modal'], { [$style['default-position']]: !hasSearchedOnce && !hasMoved }]"
      closedby="any"
      v-show="isModalVisible"
      open
    >
      <div ref="draggableAreaWrapperRef">
        <SearchTermInputRow :class="$style['search-term-wrapper']" />
        <hr style="margin: 0" />
        <SearchCategories v-model="activeSearchCategory" :class="$style['search-categories']" />
      </div>
      <ResultsList
        v-model:item-in-the-focus="itemInTheFocus"
        :items="activeSearchCategoryFoundItems"
        :class="$style['results-list']"
      />
      <RegularFadeTransition>
        <div v-show="entireModalLoadingState" :class="$style['loading-state']">
          <LoadingSpinner />
        </div>
      </RegularFadeTransition>
      <RegularFadeTransition>
        <SelectionPreview
          v-show="selectionPreviewState"
          v-model:element-bounding="selectionPreviewElementBounding"
          :item-in-the-focus="itemInTheFocus"
          :style="selectionPreviewPosition"
          :class="$style['selection-preview']"
        />
      </RegularFadeTransition>
    </dialog>
  </RegularFadeTransition>
</template>

<style module lang="scss">
.quick-search-modal {
  position: fixed;
  z-index: 999;
  width: 400px;
  margin: unset;
  padding: 0;
  pointer-events: auto;

  &.default-position {
    transform: translate(-50%, -50%);
    top: 50%;
    left: 50%;
  }
}

.search-term-wrapper {
  padding: 0.4rem 0.9rem;
}

.search-categories {
  padding: 0 0.4rem;
  margin: 0.4rem 0;
}

.quick-search-modal,
.selection-preview {
  border-radius: 6px;
  backdrop-filter: blur(6px);
  border: 1px solid #493a50;
  box-shadow: 0 0 20px #000;
  outline: none;
}

.quick-search-modal,
.results-list,
.selection-preview {
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

.selection-preview {
  position: absolute;
  left: 0;
  top: 0;
}
</style>
