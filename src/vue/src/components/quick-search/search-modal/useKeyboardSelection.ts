import type { ItemInTheFocusType, SearchResultItem } from '../../../types/quick-search'
import { onKeyStroke } from '@vueuse/core'
import { ref, watch, type Ref } from 'vue'
import { QUICK_SEARCH_MODAL_ITEM_SELECTED } from '../../../../../ts/constants'
import { shouldDefaultActionBePrevented } from '../../../utils/quick-search/outer-subscriptions'
import type { SearchCategoryNameType } from '../../../stores/quick-search/search-categories'
import { addAssetToCanvas, signalThatItemIsSelected } from '../commonFunctions'

export function useKeyboardSelection(
  isModalVisible: Ref<boolean>,
  foundItems: Ref<Array<SearchResultItem>>,
  searchTerm: Ref<string>,
  itemInTheFocus: Ref<ItemInTheFocusType>,
  activeSearchCategory: Ref<SearchCategoryNameType>,
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
    () => [searchTerm.value, activeSearchCategory.value],
    () => (selectedItem.value = null),
  )

  const commonKeyStrokeFunctions = (event: KeyboardEvent) => {
    event.preventDefault()

    return new Promise<number>((resolve, reject) => {
      if (!isModalVisible.value) {
        reject()
      }

      resolve(foundItems.value.findIndex((item) => item.id === selectedItem.value?.id))
    })
  }

  onKeyStroke('ArrowDown', (event) =>
    commonKeyStrokeFunctions(event).then((index) => {
      selectedItem.value =
        !selectedItem.value || index === foundItems.value.length - 1
          ? foundItems.value[0]
          : foundItems.value[index + 1]
      itemInTheFocus.value = selectedItem.value
    }),
  )

  onKeyStroke('ArrowUp', (event) =>
    commonKeyStrokeFunctions(event).then((index) => {
      selectedItem.value =
        !selectedItem.value || index === 0
          ? foundItems.value[foundItems.value.length - 1]
          : foundItems.value[index - 1]
      itemInTheFocus.value = selectedItem.value
    }),
  )

  onKeyStroke('Enter', (event) =>
    commonKeyStrokeFunctions(event).then((index) => {
      if (index !== -1) {
        signalThatItemIsSelected({ asset: selectedItem.value! })

        if (!shouldDefaultActionBePrevented(QUICK_SEARCH_MODAL_ITEM_SELECTED)) {
          addAssetToCanvas({ asset: selectedItem.value! })
        }
      }
    }),
  )

  return { selectedItem }
}
