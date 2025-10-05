import MouApplication from "../apps/application";
import MouCloudClient from "../clients/moulinette-cloud";

import { MouCollection, MouCollectionAsset, MouCollectionAssetType, MouCollectionAssetTypeEnum, MouCollectionCreator, MouCollectionFilters, MouCollectionPack, MouCollectionSearchResults } from "../apps/collection";
import MouBrowser from "../apps/browser";
import MouCollectionCloudBase, { MouCollectionCloudAsset } from "./collection-cloud-base";
import MouMediaUtils from "../utils/media-utils";
import { SETTINGS_SESSION_ID } from "../constants";

export default class MouCollectionCloudCached extends MouCollectionCloudBase implements MouCollection {

  override APP_NAME = "MouCollectionCloudCached"

  private error: number;

  static ERROR_SERVER_CNX = 1

  constructor() {
    super()
    this.error = 0
  }
  
  async initialize(): Promise<void> {
    const module = MouApplication.getModule()
    if(!module.cache.allAssets) {
      // retrieve private assets from Moulinette Cloud
      const params = { scope: this.getScope() }
      try {
        const results = await MouCloudClient.apiPOST("/all-assets", params)
        const assets = []
        for(const a of results.assets) {
          // retrieve pack
          const pack = results.packs[a.pack_ref]
          a.pack = {
            'name': pack.name,
            'path': pack.path,
            'creator_ref': pack.creator_ref,
            'creator': pack.creator,
            'sas': pack.sas
          },
          a.thumb = MouMediaUtils.getBasePath(a.filepath) + `_thumb.webp?${pack.sas}`
          assets.push(new MouCollectionCloudAsset(a))
        }
        module.cache.allAssets = assets
      } catch(error: any) {
        this.error = MouCollectionCloudCached.ERROR_SERVER_CNX
        MouApplication.logError(this.APP_NAME, `Not able to retrieve assets`, error)
        module.cache.allAssets = []
      }
    }
  }
  
  getId() : string {
    return "mou-cloud-cached"
  }
  
  getName(): string {
    return (game as Game).i18n.localize("MOU.collection_type_cloud_cached")
  }

  getDescription(): string {
    return (game as Game).i18n.localize("MOU.collection_type_cloud_cached_desc");
  }

  private getFilterAssets(filters: MouCollectionFilters): MouCollectionCloudAsset[] {
    const module = MouApplication.getModule()
    return module.cache.allAssets.filter((asset: MouCollectionCloudAsset) => {
      if(filters.type) {
        // special case: Map filter includes Map, Scene and ScenePacker types
        if(filters.type == MouCollectionAssetTypeEnum.Map) {
          if(![MouCollectionAssetTypeEnum.Map, MouCollectionAssetTypeEnum.Scene, MouCollectionAssetTypeEnum.ScenePacker].includes(asset.type)) return false
        }
        else if(asset.type != filters.type) return false
      }
      if(filters.creator && filters.creator != "" && asset.creator != filters.creator) return false
      if(filters.pack && filters.pack != "" && asset.pack_id != filters.pack) return false
      if(filters.searchTerms && filters.searchTerms.length > 0) {
        for(const term of filters.searchTerms.split(" ")) {
          if(!asset.name.toLowerCase().includes(term.toLowerCase())) return false
        }
      }
      return true
    })
  }

  async getTypes(filters: MouCollectionFilters): Promise<MouCollectionAssetType[]> {
    const filterDuplicates = foundry.utils.duplicate(filters)
    if(filterDuplicates.type) delete filterDuplicates.type
    const assets = this.getFilterAssets(filterDuplicates)
    const results = [] as MouCollectionAssetType[]    
    for(const t of Object.values(MouCollectionAssetTypeEnum)) {
      if(typeof t === "number" && t != MouCollectionAssetTypeEnum.Undefined) {
        const assetsCount = assets.filter((a: MouCollectionCloudAsset) => a.type == t).length
        if([MouCollectionAssetTypeEnum.Map, MouCollectionAssetTypeEnum.Scene, MouCollectionAssetTypeEnum.ScenePacker].includes(t)) {
          const mapEntry = results.find((r: MouCollectionAssetType) => r.id == MouCollectionAssetTypeEnum.Map);
          if(mapEntry) {
            mapEntry.assetsCount += assetsCount
          } else {
            results.push({ id: MouCollectionAssetTypeEnum.Map, assetsCount: assetsCount })    
          }
          continue;
        }
        results.push({ id: t, assetsCount: assetsCount })
      }
    }
    return results.filter((r: MouCollectionAssetType) => r.assetsCount > 0)
  }

  async getCreators(filters: MouCollectionFilters): Promise<MouCollectionCreator[]> {
    const filterDuplicates = foundry.utils.duplicate(filters)
    if(filterDuplicates.creator) delete filterDuplicates.creator
    if(filterDuplicates.pack) delete filterDuplicates.pack

    const assets = this.getFilterAssets(filterDuplicates)
    const creators = [] as MouCollectionCreator[]    
    const creatorsUnique = new Set<string>()
    for(const asset of assets) {
      creatorsUnique.add(asset.creator)
    }
    for(const creator of creatorsUnique) {
      creators.push({ 
        id: creator,
        name: creator, 
        assetsCount: assets.filter((a: MouCollectionCloudAsset) => a.creator == creator).length
      })
    }

    creators.sort((a: MouCollectionCreator, b: MouCollectionCreator) => a.name.localeCompare(b.name))

    return creators
  }
  
  async searchAssets(filters: MouCollectionFilters, page: number): Promise<MouCollectionSearchResults> {
    return {
      types: await this.getTypes(filters),
      creators: await this.getCreators(filters),
      packs: await this.getPacks(filters),
      assets: await this.getAssets(filters, page)
    }
  }

  async getPacks(filters: MouCollectionFilters): Promise<MouCollectionPack[]> {
    if(!filters.creator || filters.creator == "") return []
    const filterDuplicates = foundry.utils.duplicate(filters)
    if(filterDuplicates.pack) delete filterDuplicates.pack

    const assets = this.getFilterAssets(filterDuplicates)
    const packs = [] as MouCollectionPack[]    
    const packsUnique: { [key: string]: string } = {}
    for(const asset of assets) {
      if(asset.pack_id in packsUnique) continue
      packsUnique[asset.pack_id] = asset.pack
    }
    for(const packId of Object.keys(packsUnique)) {
      packs.push({ 
        id: packId,
        name: packsUnique[packId], 
        assetsCount: assets.filter((a: MouCollectionCloudAsset) => a.pack_id == packId).length
      })
    }

    packs.sort((a: MouCollectionPack, b: MouCollectionPack) => a.name.localeCompare(b.name))

    return packs
  }

  async getFolders(): Promise<string[]> {
    return []
  }

  async getAssetsCount(filters: MouCollectionFilters): Promise<number> {
    const assets = this.getFilterAssets(filters)
    return assets.length

  }

  async getAssets(filters: MouCollectionFilters, page: number): Promise<MouCollectionAsset[]> {
    const assets = this.getFilterAssets(filters)
    const fromIdx = page * MouBrowser.PAGE_SIZE
    if(fromIdx >= assets.length) return []
    return assets.slice(fromIdx, fromIdx + MouBrowser.PAGE_SIZE)
  }

  isConfigurable(): boolean {
    return false
  }

  isBrowsable(): boolean {
    return true;
  }

  configure(): void {
  }  

  getCollectionError(): string | null {
    if(this.error == MouCollectionCloudCached.ERROR_SERVER_CNX) {
      return (game as Game).i18n.localize("MOU.error_server_connection")
    }
    return null;
  }

  setPickerMode(pickerMode: boolean) {
    pickerMode; // unused
  }

  async selectAsset(asset: MouCollectionAsset): Promise<string | null> {
    const assetData = await MouCloudClient.apiGET(`/asset/${asset.id}`, { session: MouApplication.getSettings(SETTINGS_SESSION_ID) })
    const resultDownload = await this.downloadAsset(assetData)
    return resultDownload ? resultDownload.path : null
  }
}
