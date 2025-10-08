import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { autoAnimatePlugin } from '@formkit/auto-animate/vue'
// eslint-disable-next-line
// @ts-ignore HOTFIX: The import below throws a TS-error when the app is being run by the Moulinette
import QuickSearchApp from './components/quick-search/App.vue'

const appContainerNode = document.createElement('div')
appContainerNode.id = 'moulinette-vue-app-container'
document.body.append(appContainerNode)

const app = createApp(QuickSearchApp)
// TODO: to be considered, whether the ShadowRoot is needed
// const appMountPointNode = document.createElement('div')
// appContainerNode.attachShadow({ mode: 'open' }).appendChild(appMountPointNode)
// app.mount(appMountPointNode)

app.use(createPinia()).use(autoAnimatePlugin).mount(appContainerNode)
