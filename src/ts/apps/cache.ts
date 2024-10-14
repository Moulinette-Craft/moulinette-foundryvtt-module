
export default class MouCache {

  user: any
  privateAssets: any

  clearCache() {
    this.user = null
    this.privateAssets = null
  }
}