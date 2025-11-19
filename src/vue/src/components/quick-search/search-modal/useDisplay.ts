import { OPEN_QUICK_SEARCH_MODAL, CLOSE_QUICK_SEARCH_MODAL } from '../../../../../ts/constants'
import { useEventListener } from '@vueuse/core'
import { ref } from 'vue'

export function useDisplay() {
  const isModalVisible = ref(true)

  const openModal = () => {
    isModalVisible.value = true
  }

  const closeModal = () => {
    isModalVisible.value = false
  }

  useEventListener(window, OPEN_QUICK_SEARCH_MODAL, openModal)
  useEventListener(window, CLOSE_QUICK_SEARCH_MODAL, closeModal)

  return { isModalVisible, closeModal }
}
