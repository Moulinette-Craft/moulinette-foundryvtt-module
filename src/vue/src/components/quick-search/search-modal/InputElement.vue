<script setup lang="ts">
import { onStartTyping } from '@vueuse/core'
import { useTemplateRef } from 'vue'

const model = defineModel<string>({ required: true })

const inputRef = useTemplateRef<HTMLInputElement>('inputRef')

const focus = () => inputRef.value!.focus()

onStartTyping(focus)

defineExpose({ focus })
</script>

<template>
  <input v-model="model" ref="inputRef" type="text" />
</template>

<style lang="scss" scoped>
input {
  background: transparent;
  border: none;
  box-shadow: none;
  outline: none;
  padding: 0;
  color: #e7d1b1;
  height: 2rem;
}
</style>
