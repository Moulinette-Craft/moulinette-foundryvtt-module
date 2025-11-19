<script setup lang="ts">
import ItemElement from '@quick-search-components/results/ItemElement.vue'
import { useSearchStore } from '@vue-src/stores/quick-search/search'
import type { ItemInTheFocusType, SearchResultItem } from '@vue-src/types/quick-search'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'

const { searchTerm, isSearching } = storeToRefs(useSearchStore())

const itemInTheFocus = defineModel<ItemInTheFocusType>('itemInTheFocus', { required: false })

const props = defineProps<{
  items: Array<SearchResultItem>
}>()

const isNothingFoundState = computed(
  () => props.items.length === 0 && searchTerm.value.length > 0 && !isSearching.value,
)

const onItemMouseEnter = (_: MouseEvent, item: SearchResultItem) => {
  itemInTheFocus.value = item
}

const onItemMouseLeave = () => {
  itemInTheFocus.value = undefined
}
</script>

<template>
  <ul
    :class="['quick-search-results-list', { padded: items.length > 0 || isNothingFoundState }]"
    v-auto-animate
  >
    <ItemElement
      v-for="item in items"
      :key="`result-item-${item.id}`"
      :item="item"
      :data-item-id="item.id"
      @mouseenter="($event: MouseEvent) => onItemMouseEnter($event, item)"
      @mouseleave="onItemMouseLeave"
    />
    <li v-if="isNothingFoundState" class="nothing-found">
      <span>Nothing found</span>
    </li>
  </ul>
</template>

<style lang="scss" scoped>
.quick-search-results-list {
  --gap: 0.75rem;

  display: flex;
  flex-direction: column;
  gap: 4px;
  box-sizing: border-box;
  overflow-y: auto;
  overflow-x: hidden;
  margin: 0;
  border-radius: 0 6px 6px 0;
  transition: all 0.2s;

  &.padded {
    padding: var(--gap) 0.1rem var(--gap);
  }
}

.nothing-found {
  display: flex;
  justify-content: center;
  color: rgba(239, 230, 216, 0.5);
}
</style>
