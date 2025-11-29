<script setup lang="ts">
import type { SearchCategoryNameType } from '@vue-src/stores/quick-search/search-categories'
import { onKeyStroke } from '@vueuse/core'
import { computed, inject, ref, useTemplateRef } from 'vue'
import SearchCategoryIcon from '../SearchCategoryIcon.vue'
import { IS_MODAL_VISIBLE } from './constants'

const activeCategory = defineModel<SearchCategoryNameType>({ default: 'IMAGES' })

const isModalVisible = inject(IS_MODAL_VISIBLE)

const categories = ref(
  (
    [
      ['IMAGES', 'Images'],
      ['MAPS', 'Maps'],
      ['SOUNDS', 'Sounds'],
      ['ALL', 'All'],
    ] as Array<[SearchCategoryNameType, string]>
  ).map(([id, title]) => ({ id, title })),
)

const categoryRefs = useTemplateRef<Array<HTMLElement>>('categoryRefs')
const searchCategoriesRef = useTemplateRef<HTMLElement>('searchCategoriesRef')

const activeCategoryIndex = computed(() =>
  categories.value.findIndex((category) => category.id === activeCategory.value),
)
const activeCategoryBackgroundStyles = computed(() => {
  const { left, width, height } =
    categoryRefs.value?.[activeCategoryIndex.value]?.getBoundingClientRect() || {}
  const wrapperBoundingLeft = searchCategoriesRef.value?.getBoundingClientRect()?.left || 0

  // The default values used here are related to the first category in the list - IMAGES
  return {
    transform: `translateX(${(left || 6) - wrapperBoundingLeft}px)`,
    width: `${width || 90}px`,
    height: `${height || 35}px`,
  }
})

const onCategoryClick = (category: (typeof categories.value)[number]) => {
  activeCategory.value = category.id
}

onKeyStroke('Tab', (event) => {
  if (!isModalVisible?.value) {
    return false
  }

  event.preventDefault()
  event.stopPropagation()
  activeCategory.value =
    categories.value[
      activeCategoryIndex.value === categories.value.length - 1 ? 0 : activeCategoryIndex.value + 1
    ].id
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
      <SearchCategoryIcon :category="category.id" width="17" height="17" />
      <span>{{ category.title }}</span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.search-categories {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  cursor: move;
}

.active-category-background,
.category {
  transition: all 0.3s;
  border-radius: 6px;
  cursor: pointer;
}

.active-category-background {
  position: absolute;
  left: 0;
  top: 0;
  background: rgba(231, 209, 177, 0.12);
}

.category {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.6rem;
  color: #e7d1b1;

  &:hover {
    background-color: rgba(231, 209, 177, 0.06);
  }
}
</style>
