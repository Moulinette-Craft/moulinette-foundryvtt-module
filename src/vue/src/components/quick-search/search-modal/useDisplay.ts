import { OPEN_QUICK_SEARCH_MODAL, CLOSE_QUICK_SEARCH_MODAL, TOGGLE_QUICK_SEARCH_MODAL } from '../../../../../ts/constants'
import { useEventListener } from '@vueuse/core'
import { ref } from 'vue'

export function useDisplay() {
  const isModalVisible = ref(false)

  const openModal = () => {
    isModalVisible.value = true
  }

  const closeModal = () => {
    isModalVisible.value = false
  }

  const toggleModal = () => {
    isModalVisible.value = !isModalVisible.value
  }

  useEventListener(window, OPEN_QUICK_SEARCH_MODAL, openModal)
  useEventListener(window, CLOSE_QUICK_SEARCH_MODAL, closeModal)
  useEventListener(window, TOGGLE_QUICK_SEARCH_MODAL, toggleModal)

  // The FoundryVTT keybinding (CTRL+M) can open the modal, but it can never
  // close it: once the modal is open its search field holds the focus, and
  // FoundryVTT's KeyboardManager ignores every keybinding while a text input
  // is focused (`hasFocus` short-circuit). So we close it from here instead,
  // listening on `window` in the capture phase - which runs before (and, via
  // stopImmediatePropagation, instead of) FoundryVTT's own bubble-phase
  // handler, preventing a double toggle when no input happens to be focused.
  useEventListener(
    window,
    'keydown',
    (event: KeyboardEvent) => {
      if (!isModalVisible.value) return
      const isToggleCombo =
        event.code === 'KeyM' &&
        (event.ctrlKey || event.metaKey) &&
        !event.altKey &&
        !event.shiftKey
      if (!isToggleCombo) return

      event.preventDefault()
      event.stopImmediatePropagation()
      closeModal()
    },
    { capture: true },
  )

  return { isModalVisible, closeModal }
}
