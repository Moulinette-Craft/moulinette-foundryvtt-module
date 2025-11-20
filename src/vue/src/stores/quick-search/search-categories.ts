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
