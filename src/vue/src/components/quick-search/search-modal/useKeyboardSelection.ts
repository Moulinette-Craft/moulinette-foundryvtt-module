import type { AddAssetToCanvasPayloadType } from '../../../../../ts/types'
import type { SearchResultItem } from '../../../types/quick-search'
import { onKeyStroke } from '@vueuse/core'
import { ref, watch, type Ref } from 'vue'
import { ADD_ASSET_TO_CANVAS, QUICK_SEARCH_MODAL_ITEM_SELECTED } from '../../../../../ts/constants'
import { shouldDefaultActionBePrevented } from '../../../utils/quick-search/outer-subscriptions'

export function useKeyboardSelection(
  isModalVisible: Ref<boolean>,
  foundItems: Ref<Array<SearchResultItem>>,
  searchTerm: Ref<string>,
) {
  const selectedItem = ref<SearchResultItem | null>()

  watch(
    () => isModalVisible.value,
    (newValue, prevValue) => {
      if (prevValue && !newValue) {
        selectedItem.value = null
      }
    },
  )

  watch(
    () => searchTerm.value,
    () => (selectedItem.value = null),
  )

  const commonKeyStrokeFunctions = (event: KeyboardEvent) => {
    if (isModalVisible.value) {
      event.preventDefault()
    }

    return new Promise<number>((resolve, reject) => {
      if (!isModalVisible.value) {
        reject()
      }

      resolve(foundItems.value.findIndex((item) => item.id === selectedItem.value?.id))
    })
  }

  onKeyStroke('ArrowDown', (event) =>
    commonKeyStrokeFunctions(event)
      .then((index) => {
        selectedItem.value =
          !selectedItem.value || index === foundItems.value.length - 1
            ? foundItems.value[0]
            : foundItems.value[index + 1]
      })
      .catch(() => {}),
  )

  onKeyStroke('ArrowUp', (event) =>
    commonKeyStrokeFunctions(event)
      .then((index) => {
        selectedItem.value =
          !selectedItem.value || index === 0
            ? foundItems.value[foundItems.value.length - 1]
            : foundItems.value[index - 1]
      })
      .catch(() => {}),
  )

  onKeyStroke('Enter', (event) =>
    commonKeyStrokeFunctions(event)
      .then((index) => {
        if (index !== -1) {
          window.dispatchEvent(
            new CustomEvent<{ item: SearchResultItem }>(QUICK_SEARCH_MODAL_ITEM_SELECTED, {
              detail: {
                item: selectedItem.value!,
              },
            }),
          )

          if (!shouldDefaultActionBePrevented(QUICK_SEARCH_MODAL_ITEM_SELECTED)) {
            window.dispatchEvent(
              new CustomEvent<AddAssetToCanvasPayloadType>(ADD_ASSET_TO_CANVAS, {
                detail: { asset: selectedItem.value! },
              }),
            )
          }
        }
      })
      .catch(() => {}),
  )

  return { selectedItem }
}
