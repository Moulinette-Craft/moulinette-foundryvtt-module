import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
// eslint-disable-next-line
// @ts-ignore HOTFIX: The import below throws a TS-error when the app is being run by the Moulinette
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

export const config = {
  plugins: [
    vue(),
    vueDevTools()
  ],
  resolve: {
    alias: {
      '@vue-src': fileURLToPath(new URL('./src', import.meta.url)),
      '@vue-components': fileURLToPath(new URL('./src/components', import.meta.url)),
      '@quick-search-components': fileURLToPath(new URL('./src/components/quick-search', import.meta.url)),
      '@root': fileURLToPath(new URL('../', import.meta.url)),
    },
  },
}

// https://vite.dev/config/
export default defineConfig(config)
