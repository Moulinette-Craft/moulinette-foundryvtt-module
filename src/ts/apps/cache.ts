export default class MouCache {

  user: any
  privateAssets: any
  allAssets: any
  curBrowser: any

  clearCache() {
    this.user = null
    this.privateAssets = null
    this.allAssets = null
    this.curBrowser = null
  }
}