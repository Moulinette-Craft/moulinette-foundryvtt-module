import { useDraggable, useElementBounding, watchOnce } from '@vueuse/core'
import { computed, ref, type Ref, type TemplateRef } from 'vue'

export function useMove(
  modalRef: TemplateRef<HTMLElement>,
  searchTermWrapperRef: TemplateRef<HTMLElement>,
  hasSearchedOnce: Ref<boolean>,
) {
  const hasMoved = ref(false)
  const initialCenterPosition = ref({ left: 0, top: 0 })

  const { x, y } = useDraggable(searchTermWrapperRef, {
    onStart: (_, event) => {
      if ((event.target as HTMLElement)?.closest('[data-exclude-from-drag-triggers]')) {
        return false
      }

      return
    },
    onMove: () => {
      hasMoved.value = true
    },
  })
  const { width, height, left, top } = useElementBounding(modalRef)

  watchOnce(
    () => hasSearchedOnce.value,
    (newValue) => {
      if (newValue) {
        initialCenterPosition.value.left = left.value
        initialCenterPosition.value.top = top.value
      }
    },
  )

  const position = computed(() =>
    hasMoved.value
      ? {
          left: `${x.value <= 0 ? 0 : x.value >= window.innerWidth - width.value ? window.innerWidth - width.value : x.value}px`,
          top: `${y.value <= 0 ? 0 : y.value > window.innerHeight - height.value ? window.innerHeight - height.value : y.value}px`,
        }
      : hasSearchedOnce.value
        ? {
            left: `${initialCenterPosition.value.left}px`,
            top: `${initialCenterPosition.value.top}px`,
          }
        : {},
  )

  return { hasMoved, position }
}
