import MouBrowser from "../apps/browser";
import { MouCollection, MouCollectionAction, MouCollectionActionHint, MouCollectionAsset, MouCollectionAssetMeta, MouCollectionAssetType, MouCollectionAssetTypeEnum, MouCollectionCreator, MouCollectionDragData, MouCollectionFilters, MouCollectionPack } from "../apps/collection";
import MouLocalClient from "../clients/moulinette-local";
import { MEDIA_AUDIO, MEDIA_IMAGES } from "../constants";
import { AnyDict } from "../types";
import MouMediaUtils from "../utils/media-utils";
import LocalCollectionConfig from "./collection-local-index-config";

/*
enum LocalAssetAction {
  DRAG,                     // drag & drop capability for the asset
  CLIPBOARD,                // copy path to clipboard
  VIEW,                     // open sheet (without importing)
  IMPORT,                   // import asset (scenes/...)
  CREATE_ARTICLE,           // create article from asset
  PREVIEW,                  // preview audio
}*/

class MouCollectionLocalAsset implements MouCollectionAsset {
  
  id: string;
  type: number;
  format: string;
  preview: string;
  creator: string | null;
  creator_url: string | null;
  pack: string;
  pack_id: string;
  name: string;
  meta: MouCollectionAssetMeta[];
  icon: string | null;
  icons?: {descr: string, icon: string}[];
  draggable?: boolean;
  flags: AnyDict;
  
  constructor(data: AnyDict, pack: AnyDict) {
    let assetType : MouCollectionAssetTypeEnum
    if(MEDIA_IMAGES.includes(data.path.split(".").pop()?.toLocaleLowerCase() as string)) {
      assetType = MouCollectionAssetTypeEnum.Image
    } else if (MEDIA_AUDIO.includes(data.path.split(".").pop()?.toLocaleLowerCase() as string)) {
      assetType = MouCollectionAssetTypeEnum.Audio
    } else {
      assetType = MouCollectionAssetTypeEnum.Undefined
    }
    const thumbnail = assetType == MouCollectionAssetTypeEnum.Image ? data.path : null
    this.id = data.path;
    this.format = "small"
    this.preview = thumbnail ? thumbnail : "icons/svg/mystery-man.svg ",
    this.creator = null
    this.creator_url = null
    this.pack = pack.name
    this.pack_id = pack.id
    this.name = MouMediaUtils.prettyMediaName(data.path)
    this.type = assetType
    this.meta = []
    this.draggable = true
    this.icon = MouMediaUtils.getIcon(assetType)
    this.icons = []
    this.flags = {}
  }
}

export default class MouCollectionLocal implements MouCollection {

  APP_NAME = "MouCollectionLocal"

  static PLAYLIST_NAME = "Moulinette Local"
  
  private assets: AnyDict

  constructor() {
    this.assets = {}
  }

  getId(): string {
    return "mou-local"
  }

  async initialize(): Promise<void> {
    this.assets = await MouLocalClient.getAllAssets()
  }

  getName(): string {
    return (game as Game).i18n.localize("MOU.collection_type_local");
  }

  async getTypes(): Promise<MouCollectionAssetType[]> {
    const results = [] as MouCollectionAssetType[]
    
    const images = []  as AnyDict[]
    const audio = [] as AnyDict[]
    for(const pack of Object.values(this.assets)) {
      for(const a of pack.assets) {
        if(MEDIA_IMAGES.includes(a.path.split(".").pop()?.toLocaleLowerCase() as string)) {
          images.push(a)
        }
        else if(MEDIA_AUDIO.includes(a.path.split(".").pop()?.toLocaleLowerCase() as string)) {
          audio.push(a)
        }
      }
    }
    //const videos = this.assets.filter(a => MEDIA_VIDEOS.includes(a.path.split(".").pop()?.toLocaleLowerCase() as string))
    if(images.length > 0) {
      results.push({
        id: MouCollectionAssetTypeEnum.Image,
        assetsCount: images.length
      })
    }
    if(audio.length > 0) {
      results.push({
        id: MouCollectionAssetTypeEnum.Audio,
        assetsCount: audio.length
      })
    }
    return results
  }

  async getCreators(): Promise<MouCollectionCreator[]> {
    return [] as MouCollectionCreator[]
  }

  async getPacks(): Promise<MouCollectionPack[]> {
    const packs = [] as MouCollectionPack[]
    for(const packId of Object.keys(this.assets)) {
      const pack = this.assets[packId]
      packs.push({
        id: packId,
        name: pack.name,
        assetsCount: pack.assets.length
      })
    }
    return packs;
  }

  async getAssets(filters: MouCollectionFilters, page: number): Promise<MouCollectionAsset[]> {
    const results = [] as MouCollectionAsset[]
    for(const packId of Object.keys(this.assets)) {
      if(!filters.pack || filters.pack == packId) {
        const assets = this.assets[packId].assets.filter((a : AnyDict) => {
          // filter by type
          switch(filters.type) {
            case MouCollectionAssetTypeEnum.Image:
              if(!MEDIA_IMAGES.includes(a.path.split(".").pop()?.toLocaleLowerCase() as string)) return false
              break
            case MouCollectionAssetTypeEnum.Audio:
              if(!MEDIA_AUDIO.includes(a.path.split(".").pop()?.toLocaleLowerCase() as string)) return false
              break
          }
          // filter by search
          if(filters.searchTerms) {
            for(const term of filters.searchTerms.toLocaleLowerCase().split(" ")) {
              if(a.path.toLocaleLowerCase().indexOf(term) < 0) {
                return false
              }
            }
          }
          return true
        })
        for(const a of assets) {
          results.push(new MouCollectionLocalAsset(a, this.assets[packId]))
        }
      }
    }
    const fromIdx = page * MouBrowser.PAGE_SIZE
    if(fromIdx >= results.length) return []
    return results.slice(fromIdx, fromIdx + MouBrowser.PAGE_SIZE)
  }

  getRandomAssets(filters: MouCollectionFilters): Promise<MouCollectionAsset[]> {
    throw new Error("Method not implemented." + filters);
  }

  getActions(asset: MouCollectionAsset): MouCollectionAction[] {
    console.log(asset)
    const actions = [] as MouCollectionAction[]
    return actions
  }

  getActionHint(asset: MouCollectionAsset, actionId: number): MouCollectionActionHint | null {
    const action = this.getActions(asset).find(a => a.id == actionId)
    console.log(action)
    return null
  }

  async executeAction(actionId: number, asset: MouCollectionAsset): Promise<void> {
    const folderPath = `Moulinette/${asset.creator}/${asset.pack}`
    console.log(folderPath, actionId)
  }

  async fromDropData(assetId: string, data: MouCollectionDragData): Promise<void> {
    data.uuid = assetId
  }

  isConfigurable(): boolean {
    return true;
  }

  private refreshSettings() {
    
  }

  configure(callback: Function): void {
    const parent = this
    new LocalCollectionConfig(function() {
      parent.refreshSettings()
      callback()
    }).render(true)
  }


  
}
