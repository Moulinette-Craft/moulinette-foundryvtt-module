import type { AssetCollectionNameType, SearchResultItem } from '../../types/quick-search'
import MouCollectionGameIcons from '../../../../ts/collections/collection-gameicons'
import MouCollectionBBCAsset from '../../../../ts/collections/collection-bbc-sounds'
import MouCollectionLocalAsset from '../../../../ts/collections/collection-local-index'
import { MouCollectionAssetTypeEnum } from '../../../../ts/apps/collection'
import { MouAPI } from '../../../../ts/utils/api'

export type SearchCategoryNameType = 'IMAGES' | 'MAPS' | 'SOUNDS' | 'ALL'
export type SearchCategoryItemCollectionType = Extract<
  AssetCollectionNameType,
  'mou-gameicons' | 'mou-local' | 'mou-bbc-sounds'
>
type AllowedCollectionsType =
  | typeof MouCollectionGameIcons
  | typeof MouCollectionBBCAsset
  | typeof MouCollectionLocalAsset
  | typeof AllCategoriesCollection

export const SEARCH_RESULT_ITEM_CATEGORY_TO_COLLECTIONS_ACCORDANCE: Record<
  NonNullable<SearchResultItem['itemCategory']>,
  SearchCategoryItemCollectionType
> = {
  IMAGES: 'mou-gameicons',
  MAPS: 'mou-local',
  SOUNDS: 'mou-bbc-sounds',
}

export const CATEGORY_TO_TYPE = {
  IMAGES: MouCollectionAssetTypeEnum.Image,
  MAPS: MouCollectionAssetTypeEnum.Map,
  SOUNDS: MouCollectionAssetTypeEnum.Audio,
  ALL: null,
}

class Category {
  #isInitialized: boolean
  #collectionInstance: InstanceType<AllowedCollectionsType>
  #categoryId: SearchCategoryNameType
  #ignoreIdAssignment?: boolean

  constructor(
    collectionClass: AllowedCollectionsType,
    id: SearchCategoryNameType,
    ignoreIdAssignment?: boolean,
  ) {
    this.#isInitialized = false
    this.#collectionInstance = new collectionClass()
    this.#categoryId = id
    this.#ignoreIdAssignment = ignoreIdAssignment || false
  }

  async getItems(term: string) {
    if (!this.#isInitialized && 'initialize' in this.#collectionInstance) {
      await this.#collectionInstance.initialize()
    }

    this.#isInitialized = true

    const assetType = CATEGORY_TO_TYPE[this.#categoryId]
    if (assetType == null) {
      throw new Error('Invalid asset type for category ALL')
    }

    const data = await MouAPI.searchAssets(term, assetType)
    
    //const data = await this.#collectionInstance.searchAssets(searchCriteria, 0, {
    //  applySearchTermSizeRestriction: false,
    //})

    return {
      ...data,
      assets: this.#ignoreIdAssignment
        ? data.assets
        : data.assets.map((asset) => ({ ...asset, itemCategory: this.#categoryId })),
    }
  }
}

const IMAGES = new Category(MouCollectionGameIcons, 'IMAGES')
const MAPS = new Category(MouCollectionLocalAsset, 'MAPS')
const SOUNDS = new Category(MouCollectionBBCAsset, 'SOUNDS')

class AllCategoriesCollection {
  async searchAssets(
    ...args: Parameters<InstanceType<typeof MouCollectionGameIcons>['searchAssets']>
  ): ReturnType<InstanceType<typeof MouCollectionGameIcons>['searchAssets']> {
    const result = await Promise.all(
      [IMAGES, MAPS, SOUNDS].map((category) => category.getItems(args[0].searchTerms!)),
    )
    return {
      assets: result.map((item) => item.assets).flat(),
      types: result.map((item) => item.types).flat(),
      creators: result.map((item) => item.creators).flat(),
      packs: result.map((item) => item.packs).flat(),
    }
  }
}

const ALL = new Category(AllCategoriesCollection, 'ALL', true)

export const categoriesAccordance = {
  IMAGES,
  MAPS,
  SOUNDS,
  ALL,
}

export class SearchCategoryData {
  name: SearchCategoryNameType
  items: Array<SearchResultItem>
  isLoading: boolean
  lastFetchedTerm: string | null

  constructor(
    name: SearchCategoryNameType,
    items?: Array<SearchResultItem>,
    isLoading?: boolean,
    lastFetchedTerm?: string,
  ) {
    this.name = name
    this.items = items || []
    this.isLoading = isLoading || false
    this.lastFetchedTerm = lastFetchedTerm || null
  }

  static getItems(name: SearchCategoryNameType, term: string) {
    return categoriesAccordance[name].getItems(term)
  }
}
