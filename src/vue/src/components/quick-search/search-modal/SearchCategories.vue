<script setup lang="ts">
import ImageIcon from '@vue-src/components/icons/ImageIcon.vue'
import ListWithBackground from '@vue-src/components/icons/ListWithBackground.vue'
import MapWithBackground from '@vue-src/components/icons/MapWithBackground.vue'
import MusicNoteWithBackground from '@vue-src/components/icons/MusicNoteWithBackground.vue'
import type { SearchCategoryNameType } from '@vue-src/stores/quick-search/search-categories'
import { onKeyStroke } from '@vueuse/core'
import { computed, ref, useTemplateRef, type Component } from 'vue'

const activeCategory = defineModel<SearchCategoryNameType>({ default: 'IMAGES' })

const categories = ref(
  (
    [
      ['IMAGES', 'Images', ImageIcon],
      ['MAPS', 'Maps', MapWithBackground],
      ['SOUNDS', 'Sounds', MusicNoteWithBackground],
      ['ALL', 'All', ListWithBackground],
    ] as Array<[SearchCategoryNameType, string, Component]>
  ).map(([id, title, icon]) => ({ id, title, icon })),
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

  return {
    transform: `translateX(${(left || 0) - wrapperBoundingLeft}px)`,
    width: `${width || 0}px`,
    height: `${height || 0}px`,
  }
})

const onCategoryClick = (category: (typeof categories.value)[number]) => {
  activeCategory.value = category.id
}

onKeyStroke('Tab', (event) => {
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
      <component :is="category.icon" :key="`category-${category.id}-icon`" width="17" height="17" />
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
