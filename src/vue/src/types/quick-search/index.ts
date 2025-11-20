import type { useElementBounding } from '@vueuse/core'
import type { MouCollectionAsset } from '../../../../ts/apps/collection'
import type { SearchCategoryData, SearchCategoryNameType } from '../../stores/quick-search/search-categories'

export type SearchResultItem = MouCollectionAsset
export type ItemInTheFocusType = SearchResultItem | undefined
export type ElementBoundingType = Omit<ReturnType<typeof useElementBounding>, 'update'>
export type SearchResultsType = Record<SearchCategoryNameType, InstanceType<typeof SearchCategoryData>>
