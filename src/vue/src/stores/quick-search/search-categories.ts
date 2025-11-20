import type { SearchResultItem } from '../../types/quick-search'
import MouCollectionGameIcons from '../../../../ts/collections/collection-gameicons'

const IMAGES = (term: string) =>
  new MouCollectionGameIcons().searchAssets({ searchTerms: term }, 0, {
    applySearchTermSizeRestriction: false,
  })
const MAPS = (term: string) =>
  new MouCollectionGameIcons().searchAssets({ searchTerms: term }, 0, {
    applySearchTermSizeRestriction: false,
  })
const SOUNDS = (term: string) =>
  new MouCollectionGameIcons().searchAssets({ searchTerms: term }, 0, {
    applySearchTermSizeRestriction: false,
  })
const ALL = (term: string) => Promise.all([IMAGES, MAPS, SOUNDS].map((category) => category(term)))

export const categoriesAccordance = {
  IMAGES,
  MAPS,
  SOUNDS,
  ALL,
}

export type SearchCategoryNameType = keyof typeof categoriesAccordance

export class SearchCategoryData {
  name: SearchCategoryNameType
  items: Array<SearchResultItem>
  isLoading: boolean
  lastFetchedTerm: string | null
  lastFetchedAt: Date | null | undefined

  constructor (name: SearchCategoryNameType, items?: Array<SearchResultItem>, isLoading?: boolean, lastFetchedTerm?: string, lastFetchedAt?: Date) {
    this.name = name
    this.items = items || []
    this.isLoading = isLoading || false
    this.lastFetchedTerm = lastFetchedTerm || null
    this.lastFetchedAt = lastFetchedAt || null
  }
}