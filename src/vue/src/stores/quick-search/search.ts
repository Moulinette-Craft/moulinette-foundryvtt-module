import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import MouCollectionGameIcons from '../../../../ts/collections/collection-gameicons'
import type { SearchResultsType } from '@vue-src/types/quick-search'
import { SearchCategoryData, type SearchCategoryNameType } from './search-categories'

export const useSearchStore = defineStore('search', () => {
  const searchTerm = ref<string>('')
  const isSearchFetching = ref<boolean>(false)
  const isTyping = ref<boolean>(false)
  const hasSearchedOnce = ref<boolean>(false)
  const activeSearchCategory = ref<SearchCategoryNameType>('IMAGES')
  const foundItems = ref<SearchResultsType>({
    IMAGES: new SearchCategoryData('IMAGES'),
    MAPS: new SearchCategoryData('MAPS'),
    SOUNDS: new SearchCategoryData('SOUNDS'),
    ALL: new SearchCategoryData('ALL'),
  })

  const isSearching = computed(() => isSearchFetching.value || isTyping.value)

  const activeSearchCategoryFoundItems = computed(
    () => foundItems.value[activeSearchCategory.value].items,
  )

  const SEARCH_DEBOUNCE_TIMEOUT_MS = 500
  let searchDebounceTimeout = 0 as unknown as ReturnType<typeof setTimeout>

  const search = async (term: string, ignoreDebounce?: boolean) => {
    const category = activeSearchCategory.value
    isTyping.value = true
    if (term.length > 0) {
      hasSearchedOnce.value = true
    }

    clearTimeout(searchDebounceTimeout)
    if (term) {
      const performFetch = async () => {
        try {
          foundItems.value[category].isLoading = true
          isTyping.value = false
          isSearchFetching.value = true
          foundItems.value[category].lastFetchedTerm = term
          foundItems.value[category].lastFetchedAt = new Date()
          const { assets } = await new MouCollectionGameIcons().searchAssets(
            { searchTerms: term },
            0,
            { applySearchTermSizeRestriction: false },
          )
          foundItems.value[category].items = assets
        } catch {
          foundItems.value[category].items = []
        } finally {
          foundItems.value[category].isLoading = false
          isSearchFetching.value = false
        }
      }
      if (ignoreDebounce) {
        performFetch()
      } else {
        searchDebounceTimeout = setTimeout(performFetch, SEARCH_DEBOUNCE_TIMEOUT_MS)
      }
    } else {
      isTyping.value = false
      foundItems.value[category].isLoading = false
      isSearchFetching.value = false
      foundItems.value[category].items = []
    }
  }

  watch(() => searchTerm.value, value => search(value))
  watch(
    () => activeSearchCategory.value,
    (newValue, prevValue) => {
      if (foundItems.value[newValue].lastFetchedTerm !== foundItems.value[prevValue].lastFetchedTerm) {
        foundItems.value[newValue] = new SearchCategoryData(newValue)
        search(searchTerm.value, true)
      }
    }
  )

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
