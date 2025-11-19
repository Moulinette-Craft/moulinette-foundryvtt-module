<script setup lang="ts">
import type { ElementBoundingType, ItemInTheFocusType } from '@vue-src/types/quick-search'
import { vElementBounding } from '@vueuse/components'

const elementBounding = defineModel<ElementBoundingType>('elementBounding', { required: false })

defineProps<{
  itemInTheFocus: ItemInTheFocusType
}>()

const onBounding = (data: ElementBoundingType) => {
  elementBounding.value = data
}
</script>

<template>
  <div v-element-bounding="onBounding" class="selection-preview">
    <h1>{{ itemInTheFocus?.id }}</h1>
    <h1>{{ itemInTheFocus?.id }}</h1>
    <h1>{{ itemInTheFocus?.id }}</h1>
    <h1>{{ itemInTheFocus?.id }}</h1>
  </div>
</template>

<style lang="scss" scoped>
.selection-preview {
  background: rgba(0, 0, 0, 0.6);
  // transition: all 0.3s;
}
</style>
