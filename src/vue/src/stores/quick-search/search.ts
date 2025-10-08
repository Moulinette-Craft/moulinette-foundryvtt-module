import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { computedAsync } from '@vueuse/core'
import MouCollectionGameIcons from '../../../../ts/collections/collection-gameicons'
import type { MouCollectionSearchResults } from '../../../../ts/apps/collection'

export const useSearchStore = defineStore('search', () => {
  const searchTerm = ref<string>('')
  const isSearchFetching = ref<boolean>(false)
  const isTyping = ref<boolean>(false)
  const hasSearchedOnce = ref<boolean>(false)

  const isSearching = computed(() => isSearchFetching.value || isTyping.value)

  const SEARCH_DEBOUNCE_TIMEOUT_MS = 500
  let searchDebounceTimeout = 0 as unknown as ReturnType<typeof setTimeout>
  const search = async (term: string) => {
    isTyping.value = true
    if (term.length > 0) {
      hasSearchedOnce.value = true
    }

    clearTimeout(searchDebounceTimeout)
    if (term) {
      return new Promise<MouCollectionSearchResults['assets']>((resolve) => {
        searchDebounceTimeout = setTimeout(async () => {
          try {
            isTyping.value = false
            isSearchFetching.value = true
            const { assets } = await new MouCollectionGameIcons().searchAssets(
              { searchTerms: term },
              0,
              { applySearchTermSizeRestriction: false },
            )
            resolve(assets)
          } catch {
            resolve([])
          } finally {
            isSearchFetching.value = false
          }
        }, SEARCH_DEBOUNCE_TIMEOUT_MS)
      })
    } else {
      isTyping.value = false
      isSearchFetching.value = false
      return []
    }
  }

  const foundItems = computedAsync(async () => await search(searchTerm.value), [])

  return {
    searchTerm,
    isSearchFetching,
    isTyping,
    isSearching,
    hasSearchedOnce,
    search,
    foundItems,
  }
})
