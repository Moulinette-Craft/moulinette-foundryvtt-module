import type { SearchResultItem } from '../../../types/quick-search'
import type { InjectionKey, Ref } from 'vue'

export const KEYBOARD_SELECTED_ITEM_SYMBOL: InjectionKey<Ref<SearchResultItem | null | undefined>> =
  Symbol('keyboardSelectedItem')

export const IS_MODAL_VISIBLE: InjectionKey<Ref<boolean | undefined>> = Symbol('isModalVisible')
