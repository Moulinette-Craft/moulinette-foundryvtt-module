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
  <div v-element-bounding="onBounding" class="selection-preview">
    <RegularFadeTransition>
      <div :key="itemInTheFocus?.id">
        <img
          :src="itemInTheFocus?.previewUrl || ''"
          :alt="itemInTheFocus?.name"
          width="250"
          class="preview-icon"
        />
        <p class="preview-title">{{ itemInTheFocus?.name }}</p>
      </div>
    </RegularFadeTransition>
  </div>
</template>

<style lang="scss" scoped>
.selection-preview {
  background: rgba(0, 0, 0, 0.6);
  padding: 0.75rem;
}

.preview-icon {
  border-radius: 6px;
}

.preview-title {
  margin: 0.75rem 0 0;
  text-align: center;
}
</style>
