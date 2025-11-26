import { ADD_ASSET_TO_CANVAS, QUICK_SEARCH_MODAL_ITEM_SELECTED } from '../../../../ts/constants'
import { SEARCH_RESULT_ITEM_CATEGORY_TO_COLLECTIONS_ACCORDANCE } from '../../stores/quick-search/search-categories'
import type {
  AddAssetToCanvasPayloadType,
  ItemIsSelectedPayloadType,
} from '../../types/quick-search'

type InputDataType = Exclude<AddAssetToCanvasPayloadType, 'collection'>

const getCollectionNameByItemCategory = (
  itemCategory: keyof typeof SEARCH_RESULT_ITEM_CATEGORY_TO_COLLECTIONS_ACCORDANCE,
) => SEARCH_RESULT_ITEM_CATEGORY_TO_COLLECTIONS_ACCORDANCE[itemCategory]

const getPayload = (data: InputDataType) => ({
  collection: getCollectionNameByItemCategory(data.asset.itemCategory!),
  ...data,
})

const fireEvent = <ExpectedPayloadType>(eventName: string, payload: ExpectedPayloadType) =>
  window.dispatchEvent(
    new CustomEvent<ExpectedPayloadType>(eventName, {
      detail: payload,
    }),
  )

export const signalThatItemIsSelected = (data: InputDataType) =>
  fireEvent<ItemIsSelectedPayloadType>(QUICK_SEARCH_MODAL_ITEM_SELECTED, getPayload(data))

export const addAssetToCanvas = (data: InputDataType) =>
  fireEvent<AddAssetToCanvasPayloadType>(ADD_ASSET_TO_CANVAS, getPayload(data))
