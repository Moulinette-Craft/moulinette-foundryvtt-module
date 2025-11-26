import type { useElementBounding } from '@vueuse/core'
import type { MouCollectionAsset } from '../../../../ts/apps/collection'
import type {
  SearchCategoryData,
  SearchCategoryNameType,
} from '../../stores/quick-search/search-categories'

export type SearchResultItem = MouCollectionAsset & {
  itemCategory?: Exclude<SearchCategoryNameType, 'ALL'>
}

export type AssetCollectionNameType =
  | 'mou-cloud'
  | 'mou-cloud-cached'
  | 'mou-cloud-private'
  | 'mou-compendiums'
  | 'mou-local'
  | 'mou-gameicons'
  | 'mou-bbc-sounds'
  | 'mou-fontawesome'

export type ItemIsSelectedPayloadType = {
  collection?: AssetCollectionNameType
  asset: SearchResultItem
}

export type AddAssetToCanvasPayloadType = ItemIsSelectedPayloadType & {
  position?: { x: number; y: number }
}

export type ItemInTheFocusType = SearchResultItem | undefined

export type ElementBoundingType = Omit<ReturnType<typeof useElementBounding>, 'update'>

export type SearchResultsType = Record<
  SearchCategoryNameType,
  InstanceType<typeof SearchCategoryData>
>
