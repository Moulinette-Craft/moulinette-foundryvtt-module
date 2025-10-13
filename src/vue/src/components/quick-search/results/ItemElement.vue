<script setup lang="ts">
import ImageIcon from '@vue-src/components/icons/ImageIcon.vue'
import type { SearchResultItem } from '@vue-src/types/quick-search'
import { KEYBOARD_SELECTED_ITEM_SYMBOL } from '../search-modal/constants'
import { inject, nextTick, useTemplateRef, watch } from 'vue'
import { MouCollectionAssetTypeEnum } from '@root/ts/apps/collection'
import type { AddAssetToCanvasPayloadType } from '@root/ts/types'
import { ADD_ASSET_TO_CANVAS } from '@root/ts/constants'

const props = defineProps<{
  item: SearchResultItem
}>()

const keyboardSelectedItem = inject(KEYBOARD_SELECTED_ITEM_SYMBOL)

const itemRef = useTemplateRef('itemRef')

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
  const iconNode = new Image()
  iconNode.src = (itemRef.value?.querySelector('.item-icon') as HTMLImageElement)?.src || ''
  event.dataTransfer?.setDragImage(iconNode, 50, 50)
  // Set the proper data for the handler of the "dropCanvasData"-event in the module
  event.dataTransfer?.setData(
    'text/plain',
    JSON.stringify({
      moulinette: { asset: props.item.id, collection: 'mou-gameicons' },
      type: MouCollectionAssetTypeEnum[props.item.type],
      data: {
        fullAssetData: props.item,
        isQuickSearch: true,
      },
    }),
  )
}

const onItemClick = () => {
  window.dispatchEvent(
    new CustomEvent<AddAssetToCanvasPayloadType>(ADD_ASSET_TO_CANVAS, {
      detail: { asset: props.item },
    }),
  )
}
</script>

<template>
  <li
    ref="itemRef"
    :class="[
      'quick-search-result-item',
      { 'is-keyboard-selected': keyboardSelectedItem?.id === item.id },
    ]"
    draggable="true"
    @dragstart="onDragStart"
    @click="onItemClick"
  >
    <img
      :src="item.previewUrl"
      width="25"
      height="25"
      :alt="`Icon ${item.name}`"
      class="item-icon"
    />
    <span class="item-name">{{ item.name }}</span>
    <div class="item-actions-panel">
      <span class="item-category-name">Icons</span>
      <ImageIcon width="1rem" class="item-category-icon" />
    </div>
  </li>
</template>

<style lang="scss" scoped>
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
  border-radius: 0.3rem;
}

.item-actions-panel {
  gap: 0.3rem;
  margin-left: auto;
}

.item-category-name,
.item-category-icon {
  color: #666;
}
</style>
