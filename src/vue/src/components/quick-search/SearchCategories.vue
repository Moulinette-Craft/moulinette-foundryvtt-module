<script setup lang="ts">
import type { SearchCategoryNameType } from '@vue-src/stores/quick-search/search-categories'
import { computed, ref, useTemplateRef } from 'vue'

const activeCategory = defineModel<SearchCategoryNameType>({ default: 'IMAGES' })

const categories = ref(
  (
    [
      ['IMAGES', 'Images', 'test'],
      ['MAPS', 'Maps', 'test'],
      ['SOUNDS', 'Sounds', 'test'],
      ['ALL', 'All', 'test'],
    ] as Array<[SearchCategoryNameType, string, string]>
  ).map(([id, title, icon]) => ({ id, title, icon })),
)

const categoryRefs = useTemplateRef<Array<HTMLElement>>('categoryRefs')

const activeCategoryIndex = computed(() =>
  categories.value.findIndex((category) => category.id === activeCategory.value),
)
const activeCategoryBackgroundStyles = computed(() => {
  const activeRef = categoryRefs.value?.[activeCategoryIndex.value]

  return {}
})

const onCategoryClick = (category: (typeof categories.value)[number]) => {
  activeCategory.value = category.id
}
</script>

<template>
  <div class="search-categories">
    <div class="active-category-background" :style="activeCategoryBackgroundStyles"></div>
    <div
      v-for="category in categories"
      :key="`search-category-${category.id}`"
      :class="['category', { active: activeCategory === category.id }]"
      ref="categoryRefs"
      data-exclude-from-drag-triggers
      @click="() => onCategoryClick(category)"
    >
      <span>{{ category.title }}</span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.search-categories {
  position: relative;
  display: flex;
  align-items: center;
  gap: 2px;
  cursor: move;
}

.active-category-background {
  position: absolute;
  height: 100%;
  width: 10px;
  background: red;
}

.category {
  padding-inline: 0.9rem;
  cursor: pointer;
}
</style>
