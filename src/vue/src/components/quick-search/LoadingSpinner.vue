<template>
  <div class="loader"></div>
</template>

<style lang="scss" scoped>
.loader {
  width: 48px;
  height: 48px;
  border: 2px solid rgba(239, 230, 216, 0.5);
  border-bottom-color: transparent;
  border-radius: 50%;
  display: inline-block;
  box-sizing: border-box;
  animation: rotation 1s linear infinite;
}

@keyframes rotation {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
