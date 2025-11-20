import type { ElementBoundingType, ItemInTheFocusType } from '../../../../types/quick-search'
import { useElementBounding } from '@vueuse/core'
import { computed, ref, watch, watchEffect, type Ref, type TemplateRef } from 'vue'

export const PREVIEW_SIZE = {
  height: 300,
  width: 300,
}

export const PREVIEW_SIZE_SIDE_MARGIN = 15

export function useDisplay(
  modalRef: TemplateRef<HTMLElement>,
  itemInTheFocus: Ref<ItemInTheFocusType>,
  selectionPreviewBounding: Ref<ElementBoundingType | undefined>,
) {
  const state = ref(false)
  const modalBounding = useElementBounding(modalRef)
  const itemInTheFocusElement = ref<HTMLElement | null | undefined>(null)
  let changeStateTimeout = 0 as unknown as ReturnType<typeof setTimeout>

  const position = computed((previousValue) => {
    if (!state.value || !itemInTheFocus.value) {
      return previousValue
    }

    const { top: itemInFocusElementTop, height: itemInFocusElementHeight } =
      modalRef.value
        ?.querySelector(`[data-item-id="${itemInTheFocus?.value?.id}"]`)
        ?.getBoundingClientRect() || {}

    const itemInFocusVerticalMiddle =
      (itemInFocusElementTop || 0) + (itemInFocusElementHeight || 0) / 2 - modalBounding.top.value
    const selectionPreviewTotalWidth =
      (selectionPreviewBounding.value?.width?.value || 0) + PREVIEW_SIZE_SIDE_MARGIN
    return {
      transform: `translate(
        ${modalBounding.left.value - selectionPreviewTotalWidth >= 0 ? '-100%' : modalBounding.width.value + 'px'},
        ${(() => {
          const height = selectionPreviewBounding.value?.height?.value || 0
          const expectedShift = itemInFocusVerticalMiddle - height / 2

          return itemInFocusVerticalMiddle < 0
            ? 0
            : modalBounding.top.value + expectedShift + height > window.innerHeight
              ? expectedShift -
                (modalBounding.top.value + expectedShift + height - window.innerHeight)
              : modalBounding.top.value - expectedShift <= 0
                ? modalBounding.top.value * -1
                : expectedShift
        })()}px
      )`,
    }
  })

  watchEffect(() => {
    itemInTheFocusElement.value = modalRef.value?.querySelector(
      `[data-item-id="${itemInTheFocus?.value?.id}"]`,
    )
  })

  watch(
    () => itemInTheFocus.value,
    () => {
      clearTimeout(changeStateTimeout)
      state.value = false
      changeStateTimeout = setTimeout(() => {
        state.value = true
      }, 500)
    },
  )

  return {
    state,
    position,
  }
}
