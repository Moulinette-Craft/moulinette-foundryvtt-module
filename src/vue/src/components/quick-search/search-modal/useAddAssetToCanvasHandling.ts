import { useEventListener } from '@vueuse/core'
import { ADD_ASSET_TO_CANVAS, ADDED_ASSET_TO_CANVAS } from '../../../../../ts/constants'
import { ref } from 'vue'

export function useAddAssetToCanvasHandling(callbacks?: {
  addAssetToCanvas?: () => unknown
  addedAssetToCanvas?: () => unknown
}) {
  const entireModalLoadingState = ref(false)

  const onAddAssetToCanvas = () => {
    entireModalLoadingState.value = true
    if (callbacks?.addAssetToCanvas) {
      callbacks?.addAssetToCanvas()
    }
  }

  const onAddedAssetToCanvas = () => {
    entireModalLoadingState.value = false
    if (callbacks?.addedAssetToCanvas) {
      callbacks?.addedAssetToCanvas()
    }
  }

  useEventListener(window, ADD_ASSET_TO_CANVAS, onAddAssetToCanvas)
  useEventListener(window, ADDED_ASSET_TO_CANVAS, onAddedAssetToCanvas)

  return { entireModalLoadingState }
}
