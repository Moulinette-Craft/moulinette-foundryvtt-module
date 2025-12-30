<template>
  <Transition name="fade-transition" mode="out-in">
    <slot />
  </Transition>
</template>

<style module lang="scss">
.fade-transition-enter-active {
  animation-name: regular-fade-in;
  animation-duration: 0.2s;
}

.fade-transition-leave-active {
  animation-name: regular-fade-out;
  animation-duration: 0.2s;
}

@keyframes regular-fade-in {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@keyframes regular-fade-out {
  from {
    opacity: 1;
  }

  to {
    opacity: 0;
  }
}
</style>
