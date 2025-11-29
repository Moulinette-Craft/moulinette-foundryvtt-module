<script setup lang="ts">
import { cloneVNode, type VNode, type VNodeChild } from 'vue'

const state = defineModel<boolean>({ required: true })

const { autoCenter = true } = defineProps<{
  autoCenter?: boolean
}>()

const slots = defineSlots<{
  on: () => VNodeChild
  off: () => VNodeChild
}>()

function applyClassToSlot(
  slotFn: (() => VNodeChild) | undefined,
  shouldHaveClass: boolean,
  id: string,
) {
  if (!slotFn) return null

  const raw = slotFn()
  const nodes = Array.isArray(raw) ? raw : [raw]

  if (nodes.length !== 1) {
    return null
  }

  const original = nodes[0] as VNode

  return cloneVNode(original, {
    class: [
      (original.props as { class: string })?.class,
      'fade-transition-element',
      `fade-transition-element__${id}`,
      id === 'on' && autoCenter ? 'auto-center' : null,
      shouldHaveClass ? 'non-visible' : null,
    ],
  })
}
</script>

<template>
  <div class="transition-wrapper">
    <component :is="applyClassToSlot(slots.on, !state, 'on')" />
    <component :is="applyClassToSlot(slots.off, state, 'off')" />
  </div>
</template>

<style lang="scss" scoped>
.transition-wrapper {
  position: relative;
}

.fade-transition-element {
  transition: all 0.3s;
}

.fade-transition-element__on {
  position: absolute !important;
}

.auto-center {
  top: 50%;
  left: 50%;
  width: calc(100% - 6px);
  transform: translate(-50%, -50%);
}

.non-visible {
  opacity: 0;
}
</style>
