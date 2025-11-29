import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import type { SearchResultsType } from '../../types/quick-search'
import { SearchCategoryData, type SearchCategoryNameType } from './search-categories'

export const useSearchStore = defineStore('search', () => {
  const searchTerm = ref<string>('')
  const isSearchFetching = ref<boolean>(false)
  const isTyping = ref<boolean>(false)
  const hasSearchedOnce = ref<boolean>(false)
  const activeSearchCategory = ref<SearchCategoryNameType>('IMAGES')

  const getFoundItemsDefaultData = () => ({
    IMAGES: new SearchCategoryData('IMAGES'),
    MAPS: new SearchCategoryData('MAPS'),
    SOUNDS: new SearchCategoryData('SOUNDS'),
    ALL: new SearchCategoryData('ALL'),
  })

  const foundItems = ref<SearchResultsType>(getFoundItemsDefaultData())

  const isSearching = computed(() => isSearchFetching.value || isTyping.value)

  const activeSearchCategoryFoundItems = computed(
    () => foundItems.value[activeSearchCategory.value].items,
  )

  const DEFAULT_SEARCH_DEBOUNCE_TIMEOUT_MS = 500
  let searchDebounceTimeout = 0 as unknown as ReturnType<typeof setTimeout>

  const search = async (term: string, debounceMs?: number) => {
    const category = activeSearchCategory.value
    isTyping.value = true
    if (term.trim().length > 0) {
      hasSearchedOnce.value = true
    }

    clearTimeout(searchDebounceTimeout)
    if (term) {
      searchDebounceTimeout = setTimeout(async () => {
        try {
          foundItems.value[category].isLoading = true
          isTyping.value = false
          isSearchFetching.value = true
          foundItems.value[category].lastFetchedTerm = term
          const { assets } = await SearchCategoryData.getItems(category, term)
          foundItems.value[category].items = assets
        } catch {
          foundItems.value[category].items = []
        } finally {
          foundItems.value[category].isLoading = false
          isSearchFetching.value = false
        }
      }, debounceMs || DEFAULT_SEARCH_DEBOUNCE_TIMEOUT_MS)
    } else {
      isTyping.value = false
      foundItems.value[category].isLoading = false
      isSearchFetching.value = false
      foundItems.value[category].items = []
    }
  }

  watch(
    () => searchTerm.value,
    (newValue, prevValue) => {
      if (prevValue.trim().length > 0 && newValue.trim().length === 0) {
        foundItems.value = getFoundItemsDefaultData()
      }

      search(newValue)
    },
  )
  watch(
    () => activeSearchCategory.value,
    (newValue) => {
      if (foundItems.value[newValue].lastFetchedTerm !== searchTerm.value) {
        foundItems.value[newValue] = new SearchCategoryData(newValue)
        search(searchTerm.value, 200)
      }
    },
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
