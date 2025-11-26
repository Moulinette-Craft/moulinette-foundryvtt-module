<script setup lang="ts">
import { QUICK_SEARCH_MODAL_STOP_ALL_AUDIO } from '@root/ts/constants'
import PlayIcon from '@vue-src/components/icons/PlayIcon.vue'
import StopIcon from '@vue-src/components/icons/StopIcon.vue'
import type { SearchResultItem } from '@vue-src/types/quick-search'
import { useEventListener } from '@vueuse/core'
import { nextTick, onUnmounted } from 'vue'

const props = defineProps<{
  item: SearchResultItem
}>()

const isPlaying = defineModel<boolean>('isPlaying')

let audio: HTMLAudioElement | undefined = undefined

const onClick = (event: Event) => {
  event.stopPropagation()

  if (audio && isPlaying.value) {
    stop()
  } else {
    if (!audio) {
      audio = new Audio(props.item.previewUrl)
      audio.addEventListener('canplay', play)
      audio.addEventListener('play', onPlay)
      audio.addEventListener('ended', stop)
      audio.addEventListener('pause', stop)
    } else {
      play()
    }
  }
}

const onPlay = () => {
  isPlaying.value = true
}

const play = () => {
  window.dispatchEvent(new CustomEvent(QUICK_SEARCH_MODAL_STOP_ALL_AUDIO))
  nextTick(() => {
    audio?.play()
  })
}

const stop = () => {
  if (audio) {
    audio.pause()
    audio.currentTime = 0
    isPlaying.value = false
    audio.removeEventListener('canplay', play)
  }
}

const onStopAllAudio = stop

useEventListener(window, QUICK_SEARCH_MODAL_STOP_ALL_AUDIO, onStopAllAudio)

onUnmounted(() => {
  audio?.removeEventListener('canplay', play)
  audio?.removeEventListener('play', onPlay)
  audio?.removeEventListener('ended', stop)
  audio?.removeEventListener('pause', stop)
})
</script>

<template>
  <div class="play-button" @click="onClick">
    <PlayIcon
      :class="['action-icon play-icon', { 'non-visible': isPlaying }]"
      class="action-icon"
    />
    <StopIcon :class="['action-icon stop-icon', { 'non-visible': !isPlaying }]" />
  </div>
</template>

<style lang="scss" scoped>
.play-button {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 25px;
  max-width: 25px;
  min-height: 25px;
  max-height: 25px;
  padding: 6px;
  z-index: 2;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.3s;

  &:hover {
    background: rgba(231, 209, 177, 0.12);
  }
}

.action-icon {
  height: 100%;
  width: auto;
  color: rgba(239, 230, 216, 1);
  transition: all 0.2s;
}

.stop-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  width: calc(100% - 6px);
  transform: translate(-50%, -50%);
}

.non-visible {
  opacity: 0;
}
</style>
