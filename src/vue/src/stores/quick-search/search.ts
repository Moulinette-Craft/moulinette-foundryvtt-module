import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import MouCollectionGameIcons from '../../../../ts/collections/collection-gameicons'
import type { SearchResultsType } from '@vue-src/types/quick-search'
import type { SearchCategoryNameType } from './search-categories'

export const useSearchStore = defineStore('search', () => {
  const searchTerm = ref<string>('')
  const isSearchFetching = ref<boolean>(false)
  const isTyping = ref<boolean>(false)
  const hasSearchedOnce = ref<boolean>(false)
  const activeSearchCategory = ref<SearchCategoryNameType>('IMAGES')
  const foundItems = ref<SearchResultsType>({
    IMAGES: { items: [] },
    MAPS: { items: [] },
    SOUNDS: { items: [] },
    ALL: { items: [] },
  })

  const isSearching = computed(() => isSearchFetching.value || isTyping.value)

  const activeSearchCategoryFoundItems = computed(
    () => foundItems.value[activeSearchCategory.value].items,
  )

  const SEARCH_DEBOUNCE_TIMEOUT_MS = 500
  let searchDebounceTimeout = 0 as unknown as ReturnType<typeof setTimeout>

  const search = async (term: string) => {
    isTyping.value = true
    if (term.length > 0) {
      hasSearchedOnce.value = true
    }

    clearTimeout(searchDebounceTimeout)
    if (term) {
      searchDebounceTimeout = setTimeout(async () => {
        try {
          isTyping.value = false
          isSearchFetching.value = true
          const { assets } = await new MouCollectionGameIcons().searchAssets(
            { searchTerms: term },
            0,
            { applySearchTermSizeRestriction: false },
          )
          foundItems.value[activeSearchCategory.value].items = assets
        } catch {
          foundItems.value[activeSearchCategory.value].items = []
        } finally {
          isSearchFetching.value = false
        }
      }, SEARCH_DEBOUNCE_TIMEOUT_MS)
    } else {
      isTyping.value = false
      isSearchFetching.value = false
      foundItems.value[activeSearchCategory.value].items = []
    }
  }

  watch(() => searchTerm.value, search)

  return {
    searchTerm,
    isSearchFetching,
    isTyping,
    isSearching,
    hasSearchedOnce,
    search,
    activeSearchCategory,
    foundItems,
    activeSearchCategoryFoundItems,
  }
})
