import { useDraggable, useElementBounding } from '@vueuse/core'
import { computed, ref, type Ref, type TemplateRef } from 'vue'

export function useMove(
  modalRef: TemplateRef<HTMLElement>,
  searchTermWrapperRef: TemplateRef<HTMLElement>,
  hasSearchedOnce: Ref<boolean>,
) {
  const hasMoved = ref(false)

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

  const position = computed(() =>
    hasMoved.value
      ? {
          left: `${x.value <= 0 ? 0 : x.value >= window.innerWidth - width.value ? window.innerWidth - width.value : x.value}px`,
          top: `${y.value <= 0 ? 0 : y.value > window.innerHeight - height.value ? window.innerHeight - height.value : y.value}px`,
        }
      : hasSearchedOnce.value
        ? {
            left: `${left.value}px`,
            top: `${top.value}px`,
          }
        : {},
  )

  return { hasMoved, position }
}
