
export default class MouCache {

  user: any
  privateAssets: any
  allAssets: any

  clearCache() {
    this.user = null
    this.privateAssets = null
    this.allAssets = null
  }
}