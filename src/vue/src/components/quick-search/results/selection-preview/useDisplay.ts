import type { SearchCategoryNameType } from '../../../../stores/quick-search/search-categories'
import type { ElementBoundingType, ItemInTheFocusType } from '../../../../types/quick-search'
import { useElementBounding } from '@vueuse/core'
import { computed, ref, watch, watchEffect, type Ref, type TemplateRef } from 'vue'

export const PREVIEW_SIZE = {
  height: 300,
  width: 300,
}

export const PREVIEW_SIZE_SIDE_MARGIN = 10

export function useDisplay(
  modalRef: TemplateRef<HTMLElement>,
  itemInTheFocus: Ref<ItemInTheFocusType>,
  selectionPreviewBounding: Ref<ElementBoundingType | undefined>,
  activeSearchCategory: Ref<SearchCategoryNameType>,
  isModalVisible: Ref<boolean>,
  searchTerm: Ref<string>,
) {
  const state = ref(false)
  const modalBounding = useElementBounding(modalRef)
  const itemInTheFocusElement = ref<HTMLElement | null | undefined>(null)
  let changeStateTimeout = 0 as unknown as ReturnType<typeof setTimeout>

  const position = computed((previousValue) => {
    if (!state.value || !itemInTheFocus.value) {
      return previousValue
    }

    const el = modalRef.value?.querySelector(`[data-item-id="${itemInTheFocus?.value?.id}"]`)
    const { top = 0, height = 0 } = el?.getBoundingClientRect() || {}
    const itemMiddle = top + height / 2 - modalBounding.top.value
    const tooltipHeight = selectionPreviewBounding?.value?.height?.value || 0
    const tooltipWidth =
      (selectionPreviewBounding?.value?.width?.value || 0) + PREVIEW_SIZE_SIDE_MARGIN
    const fitsOnLeft = modalBounding.left.value - tooltipWidth >= 0
    const translateX = fitsOnLeft
      ? `calc(-100% - ${PREVIEW_SIZE_SIDE_MARGIN}px)`
      : `${modalBounding.width.value + PREVIEW_SIZE_SIDE_MARGIN}px`
    const modalTop = modalBounding.top.value
    const viewportHeight = window.innerHeight
    const expectedShift = itemMiddle - tooltipHeight / 2
    const minShift = -modalTop
    const maxShift = viewportHeight - modalTop - tooltipHeight

    const translateY = Math.min(Math.max(expectedShift, minShift), maxShift)

    return {
      transform: `translate(${translateX}, ${translateY}px)`,
    }
  })

  watchEffect(() => {
    itemInTheFocusElement.value = modalRef.value?.querySelector(
      `[data-item-id="${itemInTheFocus?.value?.id}"]`,
    )
  })

  watch(
    () => itemInTheFocusElement.value,
    (newValue) => {
      clearTimeout(changeStateTimeout)
      state.value = false

      if (newValue) {
        const observer = new IntersectionObserver(
          (entries) => {
            if (entries[0].isIntersecting) {
              observer.disconnect()
              if (
                newValue &&
                ['IMAGES', 'MAPS'].includes(itemInTheFocus.value?.itemCategory || '')
              ) {
                changeStateTimeout = setTimeout(() => {
                  state.value = true
                }, 300)
              }
            }
          },
          {
            threshold: 1.0,
          },
        )

        observer.observe(newValue)
      }
    },
  )

  watch(
    () => [activeSearchCategory.value, isModalVisible.value, searchTerm.value],
    () => {
      itemInTheFocus.value = undefined
    },
  )

  return {
    state,
    position,
  }
}
