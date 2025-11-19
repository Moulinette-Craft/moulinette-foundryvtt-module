import type { useElementBounding } from '@vueuse/core'
import type { MouCollectionAsset } from '../../../../ts/apps/collection'

export type SearchResultItem = MouCollectionAsset
export type ItemInTheFocusType = SearchResultItem | undefined
export type ElementBoundingType = Omit<ReturnType<typeof useElementBounding>, 'update'>
