<script setup lang="ts">
import type { SearchCategoryNameType } from '@vue-src/stores/quick-search/search-categories'
import { onKeyStroke } from '@vueuse/core'
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
const searchCategoriesRef = useTemplateRef<HTMLElement>('searchCategoriesRef')

const activeCategoryIndex = computed(() =>
  categories.value.findIndex((category) => category.id === activeCategory.value),
)
const activeCategoryBackgroundStyles = computed(() => {
  const { left, width } = categoryRefs.value?.[activeCategoryIndex.value]?.getBoundingClientRect() || {}
  const wrapperBoundingLeft = searchCategoriesRef.value?.getBoundingClientRect()?.left || 0

  return {
    transform: `translateX(${(left || 0) - wrapperBoundingLeft}px)`,
    width: `${width || 0}px`
  }
})

const onCategoryClick = (category: (typeof categories.value)[number]) => {
  activeCategory.value = category.id
}

onKeyStroke('Tab', (event) => {
  event.preventDefault()
  event.stopPropagation()
  activeCategory.value = categories.value[activeCategoryIndex.value === categories.value.length - 1 ? 0 : activeCategoryIndex.value + 1].id
})
</script>

<template>
  <div ref="searchCategoriesRef" class="search-categories">
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
  left: 0;
  top: 0;
  height: 100%;
  width: 10px;
  // background: rgba(153, 121, 185, 0.14);
  background: red;
  transition: all 0.3s;
  border-radius: 6px;
}

.category {
  padding-inline: 0.9rem;
  cursor: pointer;
}
</style>
