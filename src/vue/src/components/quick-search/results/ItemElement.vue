<script setup lang="ts">
import type { SearchResultItem } from '@vue-src/types/quick-search'
import { KEYBOARD_SELECTED_ITEM_SYMBOL } from '../search-modal/constants'
import { computed, inject, nextTick, ref, useTemplateRef, watch } from 'vue'
import { MouCollectionAssetTypeEnum } from '@root/ts/apps/collection'
import { QUICK_SEARCH_MODAL_ITEM_SELECTED } from '@root/ts/constants'
import { shouldDefaultActionBePrevented } from '@vue-src/utils/quick-search/outer-subscriptions'
import MusicNote from '@vue-src/components/icons/MusicNote.vue'
import { UseImage } from '@vueuse/components'
import SearchCategoryIcon from '../SearchCategoryIcon.vue'
import { addAssetToCanvas, signalThatItemIsSelected } from '../commonFunctions'
import AudioPreviewButton from './AudioPreviewButton.vue'
import { useElementHover } from '@vueuse/core'
import InstantFadeTransition from '@vue-src/components/InstantFadeTransition.vue'

import { useCssModule } from 'vue'
const style = useCssModule()

const props = defineProps<{
  item: SearchResultItem
}>()

const itemDragGhostIconId = `icon-${window.crypto.randomUUID()}`

const keyboardSelectedItem = inject(KEYBOARD_SELECTED_ITEM_SYMBOL)

const itemRef = useTemplateRef('itemRef')

const isHovered = useElementHover(itemRef, { delayEnter: 300 })

const isAudioPreviewPlaying = ref(false)

const displayAudioPreviewButton = computed(
  () =>
    isHovered.value ||
    keyboardSelectedItem?.value?.id === props.item.id ||
    isAudioPreviewPlaying.value,
)

const itemCategoryName = computed(
  () =>
    ({
      IMAGES: 'Icons',
      MAPS: 'Maps',
      SOUNDS: 'Sounds',
    })[props.item.itemCategory || 'IMAGES'],
)

const displayItemIcon = computed(() => ['IMAGES', 'MAPS'].includes(props.item.itemCategory || ''))

watch(
  () => keyboardSelectedItem?.value,
  (newValue) => {
    if (newValue?.id === props.item.id) {
      nextTick(() => {
        if (itemRef.value) {
          itemRef.value.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      })
    }
  },
)

const onDragStart = (event: DragEvent) => {
  event.dataTransfer?.setDragImage(
    (() => {
      const itemIcon = itemRef.value?.querySelector(`.${style['item-icon']}`)
      let element: HTMLElement = new Image()
      if (itemIcon?.tagName === 'IMG') {
        ;(element as HTMLImageElement).src =
          (itemRef.value?.querySelector(`.${style['item-icon']}`) as HTMLImageElement)?.src || ''
      } else {
        element = itemIcon!.cloneNode(true) as HTMLElement
      }
      // Default SVG placeholder image that is always present
      element.setAttribute('id', itemDragGhostIconId)
      element.setAttribute('width', '200')
      element.setAttribute('height', '200')
      element.style.position = 'fixed'
      element.style.opacity = '1'
      element.removeAttribute('class')
      document.getElementById('mtte-quick-search')!.appendChild(element)

      return element
    })(),
    50,
    50,
  )
  // Set the proper data for the handler of the "dropCanvasData"-event in the module
  event.dataTransfer?.setData(
    'text/plain',
    JSON.stringify({
      moulinette: { asset: props.item.id },
      type: MouCollectionAssetTypeEnum[props.item.type],
      data: {
        fullAssetData: props.item,
        isQuickSearch: true,
      },
    }),
  )
}

const onDragEnd = () => document.querySelector(`#${itemDragGhostIconId}`)?.remove()

const onItemClick = () => {
  signalThatItemIsSelected({ asset: props.item })

  if (!shouldDefaultActionBePrevented(QUICK_SEARCH_MODAL_ITEM_SELECTED)) {
    addAssetToCanvas({ asset: props.item })
  }
}
</script>

<template>
  <li
    ref="itemRef"
    :class="[
      $style['quick-search-result-item'],
      { [style['is-keyboard-selected']]: keyboardSelectedItem?.id === item.id },
    ]"
    draggable="true"
    @dragstart="onDragStart"
    @dragend="onDragEnd"
    @click="onItemClick"
  >
    <UseImage
      v-if="displayItemIcon"
      :src="item.previewUrl"
      :width="25"
      :alt="`Icon ${item.name}`"
      :class="$style['item-icon']"
    >
      <template #error>
        <SearchCategoryIcon
          :category="item.itemCategory!"
          width="25"
          :class="[style['item-icon'], style['item-icon-placeholder']]"
        />
      </template>
    </UseImage>
    <InstantFadeTransition
      v-model="displayAudioPreviewButton"
      v-if="item.itemCategory === 'SOUNDS'"
    >
      <template #on>
        <AudioPreviewButton v-model:is-playing="isAudioPreviewPlaying" :item="item" />
      </template>
      <template #off>
        <MusicNote width="25" height="25" :class="[style['item-icon'], style['item-icon-placeholder']]" />
      </template>
    </InstantFadeTransition>
    <span :class="$style['item-name']">{{ item.name }}</span>
    <div :class="$style['item-actions-panel']">
      <span :class="$style['item-category-name']">{{ itemCategoryName }}</span>
      <SearchCategoryIcon
        :category="item.itemCategory!"
        width="1rem"
        height="1rem"
        :class="$style['item-category-icon']"
      />
    </div>
  </li>
</template>

<style module lang="scss">
.quick-search-result-item,
.item-actions-panel {
  display: flex;
  align-items: center;
}

.quick-search-result-item {
  margin: 0;
  padding: 0.25rem 0.675rem;
  gap: 0.675rem;
  border-radius: 0.35rem;
  transition: all 0.2s;
  cursor: pointer;

  &.is-keyboard-selected {
    background-color: rgba(179, 160, 198, 0.14);
  }

  &:hover {
    background-color: rgba(153, 121, 185, 0.14);
  }
}

.item-icon {
  height: auto;
  border-radius: 0.3rem;
  flex-shrink: 0;
}

.sounds-item-icon-wrapper {
  min-width: 25px;
  max-width: 25px;
  min-height: 25px;
  max-height: 25px;
}

.item-icon-placeholder {
  color: rgba(239, 230, 216, 1);
}

.item-actions-panel {
  gap: 0.3rem;
  margin-left: auto;
}

.item-category-name,
.item-category-icon {
  color: #666;
}

.item-name {
  color: rgba(239, 230, 216, 1);
}
</style>
