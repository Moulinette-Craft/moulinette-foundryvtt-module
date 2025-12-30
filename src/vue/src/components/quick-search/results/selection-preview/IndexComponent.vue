<script setup lang="ts">
import RegularFadeTransition from '@vue-src/components/RegularFadeTransition.vue'
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
  <div v-element-bounding="onBounding" :class="$style['selection-preview']">
    <RegularFadeTransition>
      <div :key="itemInTheFocus?.id">
        <img
          :src="itemInTheFocus?.previewUrl || ''"
          :alt="itemInTheFocus?.name"
          width="200"
          class="preview-icon"
        />
        <p class="preview-title">{{ itemInTheFocus?.name }}</p>
      </div>
    </RegularFadeTransition>
  </div>
</template>

<style lang="scss" module>
.selection-preview {
  padding: 0.5rem;
}

.preview-icon {
  border-radius: 6px;
}

.preview-title {
  margin: 0.75rem 0 0;
  text-align: center;
  color: rgba(239, 230, 216, 1);
}
</style>
