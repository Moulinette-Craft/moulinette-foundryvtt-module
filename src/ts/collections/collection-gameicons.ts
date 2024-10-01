import MouBrowser from "../apps/browser";
import { MouCollection, MouCollectionAction, MouCollectionActionHint, MouCollectionAsset, MouCollectionAssetMeta, MouCollectionAssetType, MouCollectionAssetTypeEnum, MouCollectionCreator, MouCollectionDragData, MouCollectionFilters, MouCollectionPack } from "../apps/collection";
import { MouGameIcon, MouGameIconsClient } from "../clients/gameicons";
import { AnyDict } from "../types";
import MouMediaUtils from "../utils/media-utils";

enum GameIconsAssetAction {
  DRAG,                     // drag & drop capability for the asset
  CLIPBOARD,                // copy path to clipboard
}

class MouCollectionGameIconsAsset implements MouCollectionAsset {
  
  id: string;
  url: string;
  previewUrl: string;
  type: number;
  format: string;
  creator: string | null;
  creatorUrl: string | null;
  pack: string | null;
  pack_id: string | null;
  name: string;
  meta: MouCollectionAssetMeta[];
  icon: string | null;
  icons?: { descr: string; icon: string; }[] | undefined;
  background_color?: string | undefined;
  draggable?: boolean | undefined;
  flags: AnyDict;

  constructor(asset: MouGameIcon) {
    this.id = asset.id
    this.url = asset.url
    this.previewUrl = asset.url
    this.type = MouCollectionAssetTypeEnum.Image
    this.format = "tiny"
    this.creator = asset.author
    this.creatorUrl = "https://game-icons.net/about.html#authors"
    this.pack = null
    this.pack_id = null
    this.name = asset.name
    this.meta = [] as MouCollectionAssetMeta[]
    this.icon = null
    this.flags = {}
  }
}

export default class MouCollectionGameIcons implements MouCollection {
  
  APP_NAME = "MouCollectionGameIcons"

  private currentHits: number = 0

  getId(): string {
    return "mou-gameicons"
  }
  
  getName(): string {
    return (game as Game).i18n.localize("MOU.collection_type_gameicons");
  }

  async initialize(): Promise<void> {
    // do nothing
  }
  
  /**
   * Game Icons are exclusively images.
   */
  async getTypes(): Promise<MouCollectionAssetType[]> {
    const results = [] as MouCollectionAssetType[]
    results.push({ id: MouCollectionAssetTypeEnum.Image, assetsCount: await MouGameIconsClient.getIconsCount() })
    return results
  }

  async getCreators(): Promise<MouCollectionCreator[]> {
    return [] as MouCollectionCreator[]
  }

  async getPacks(): Promise<MouCollectionPack[]> {
    return [] as MouCollectionPack[]
  }

  async getFolders(): Promise<string[]> {
    return [] as string[]
  }

  async getAssetsCount(): Promise<number> {
    return this.currentHits
  }

  async getAssets(filters: MouCollectionFilters, page: number): Promise<MouCollectionAsset[]> {
    const assets = [] as MouCollectionGameIconsAsset[]
    if(filters.searchTerms && filters.searchTerms.length > 0) {
      // if max page reached, return empty array
      if(page > 0 && page * MouBrowser.PAGE_SIZE > this.currentHits) {
        return [] as MouCollectionAsset[]
      }
      const results = await MouGameIconsClient.searchIcons(filters.searchTerms, page)
      for(const result of results.icons) {
        assets.push(new MouCollectionGameIconsAsset(result))
      }
      this.currentHits = results.count
    }
    return assets
  }

  async getRandomAssets(filters: MouCollectionFilters): Promise<MouCollectionAsset[]> {
    console.log(filters)
    return [] as MouCollectionAsset[]
  }

  getActions(asset: MouCollectionAsset): MouCollectionAction[] {
    const actions = [] as MouCollectionAction[]
    const assetType = MouCollectionAssetTypeEnum[asset.type]
    actions.push({ id: GameIconsAssetAction.DRAG, small: true, drag: true, name: (game as Game).i18n.format("MOU.action_drag", { type: assetType}), icon: "fa-solid fa-hand" })
    actions.push({ id: GameIconsAssetAction.CLIPBOARD, small: true, name: (game as Game).i18n.localize("MOU.action_clipboard"), icon: "fa-solid fa-clipboard" })
    return actions
  }

  getActionHint(asset: MouCollectionAsset, actionId: number): MouCollectionActionHint | null {
    const action = this.getActions(asset).find(a => a.id == actionId)
    if(!action) return null
    switch(actionId) {
      case GameIconsAssetAction.DRAG: return { name: action.name, description: (game as Game).i18n.localize("MOU.action_hint_drag_image") }
      case GameIconsAssetAction.CLIPBOARD: return { name: action.name, description: (game as Game).i18n.localize("MOU.action_hint_clipboard") }
    }
    return null
  }

  async executeAction(actionId: number, asset: MouCollectionAsset): Promise<void> {
    //const folderPath = `Moulinette/Game Icons`
    switch(actionId) {
      case GameIconsAssetAction.DRAG:
        ui.notifications?.info((game as Game).i18n.localize("MOU.dragdrop_instructions"))
        break
      
      case GameIconsAssetAction.CLIPBOARD:
        const imagePath = await MouGameIconsClient.downloadIcon(asset.id, "#ffffff", "#000000")
        if(imagePath) {
          MouMediaUtils.copyToClipboard(imagePath)
        }
        break
    }
  }

  async fromDropData(assetId: string, data: MouCollectionDragData): Promise<void> {
    console.log(assetId, data)
  }

  async dropDataCanvas(canvas: Canvas, data: AnyDict): Promise<void> {
    console.log(canvas, data)
  }

  isConfigurable(): boolean {
    return false
  }

  configure(callback: Function): void {
    console.log(callback)
  }

  

  
  
}
