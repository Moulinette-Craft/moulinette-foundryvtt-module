import type { SearchResultItem } from '../../../types/quick-search'
import type { InjectionKey, Ref } from 'vue'

export const KEYBOARD_SELECTED_ITEM_SYMBOL: InjectionKey<Ref<SearchResultItem | null | undefined>> =
  Symbol('keyboardSelectedItem')
