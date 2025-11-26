<script setup lang="ts">
import { computed } from 'vue'
import ImageIcon from '@vue-src/components/icons/ImageIcon.vue'
import ListWithBackground from '@vue-src/components/icons/ListWithBackground.vue'
import MapWithBackground from '@vue-src/components/icons/MapWithBackground.vue'
import MusicNoteWithBackground from '@vue-src/components/icons/MusicNoteWithBackground.vue'
import type { SearchCategoryNameType } from '@vue-src/stores/quick-search/search-categories'

const props = defineProps<{
  category: SearchCategoryNameType
}>()

const IconComponent = computed(
  () =>
    ({
      IMAGES: ImageIcon,
      MAPS: MapWithBackground,
      SOUNDS: MusicNoteWithBackground,
      ALL: ListWithBackground,
    })[props.category],
)
</script>

<template>
  <component :is="IconComponent" :key="`search-category-cion-${category}`" />
</template>
