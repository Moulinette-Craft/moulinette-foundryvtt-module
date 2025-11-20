import type { SearchResultItem } from '../../types/quick-search'
import MouCollectionGameIcons from '../../../../ts/collections/collection-gameicons'
import MouCollectionBBCAsset from '../../../../ts/collections/collection-bbc-sounds'
import MouCollectionLocalAsset from '../../../../ts/collections/collection-local-index'

const IMAGES = (term: string) =>
  new MouCollectionGameIcons().searchAssets({ searchTerms: term }, 0, {
    applySearchTermSizeRestriction: false,
  })
const MAPS = (term: string) => new MouCollectionLocalAsset().searchAssets({ searchTerms: term }, 0)
const SOUNDS = (term: string) =>
  new MouCollectionBBCAsset().searchAssets({ searchTerms: term }, 0, {
    applySearchTermSizeRestriction: false,
  })
const ALL = async (term: string) => {
  const result = await Promise.all([IMAGES, MAPS, SOUNDS].map((category) => category(term)))
  return { assets: result.map((item) => item.assets).flat() }
}

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

  constructor(
    name: SearchCategoryNameType,
    items?: Array<SearchResultItem>,
    isLoading?: boolean,
    lastFetchedTerm?: string,
    lastFetchedAt?: Date,
  ) {
    this.name = name
    this.items = items || []
    this.isLoading = isLoading || false
    this.lastFetchedTerm = lastFetchedTerm || null
    this.lastFetchedAt = lastFetchedAt || null
  }

  static getItems(name: SearchCategoryNameType, term: string) {
    return categoriesAccordance[name](term)
  }
}
