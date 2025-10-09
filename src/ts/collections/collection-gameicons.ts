import MouApplication from "../apps/application";
import MouBrowser from "../apps/browser";
import { MouCollection, MouCollectionAction, MouCollectionActionHint, MouCollectionAsset, MouCollectionAssetMeta, MouCollectionAssetType, MouCollectionAssetTypeEnum, MouCollectionCreator, MouCollectionDragData, MouCollectionFilters, MouCollectionPack, MouCollectionSearchResults } from "../apps/collection";
import { MouGameIcon, MouGameIconsClient } from "../clients/gameicons";
import { SETTINGS_ADVANCED } from "../constants";
import { AnyDict } from "../types";
import MouFoundryUtils from "../utils/foundry-utils";
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
    this.draggable = true
    this.flags = {}
  }
}

export default class MouCollectionGameIcons implements MouCollection {
  
  APP_NAME = "MouCollectionGameIcons"
  
  static ERROR_SERVER_CNX = 1

  private currentHits: number = 0
  private error: number = 0 

  getId(): string {
    return "mou-gameicons"
  }
  
  getName(): string {
    return (game as Game).i18n.localize("MOU.collection_type_gameicons");
  }

  getDescription(): string {
    return (game as Game).i18n.localize("MOU.collection_type_gameicons_desc");
  }

  async initialize(): Promise<void> {
    // do nothing
    this.error = 0
  }
  
  getSupportedTypes(): MouCollectionAssetTypeEnum[] {
    return [MouCollectionAssetTypeEnum.Image];
  }

  /**
   * Game Icons are exclusively images.
   */
  async getTypes(): Promise<MouCollectionAssetType[]> {
    const results = [] as MouCollectionAssetType[]
    try {
      results.push({ id: MouCollectionAssetTypeEnum.Image, assetsCount: await MouGameIconsClient.getIconsCount() })
    } catch(error) {
      this.error = MouCollectionGameIcons.ERROR_SERVER_CNX
      MouApplication.logError(this.APP_NAME, `Not able to get icons count from game-icons.net`, error)
    }
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

  async searchAssets(filters: MouCollectionFilters, page: number, options?: { applySearchTermSizeRestriction: boolean }): Promise<MouCollectionSearchResults> {
    return {
      types: await this.getTypes(),
      creators: await this.getCreators(),
      packs: await this.getPacks(),
      assets: await this.getAssets(filters, page, options)
    }
  }

  async getAssets(filters: MouCollectionFilters, page: number, options?: { applySearchTermSizeRestriction: boolean }): Promise<MouCollectionAsset[]> {
    const applySearchTermSizeRestriction = 'applySearchTermSizeRestriction' in (options || {}) ? options?.applySearchTermSizeRestriction : true
    const assets = [] as MouCollectionGameIconsAsset[]
    if(filters.searchTerms && (applySearchTermSizeRestriction ? filters.searchTerms.length > 2 : true)) {
      // if max page reached, return empty array
      if(page > 0 && page * MouBrowser.PAGE_SIZE > this.currentHits) {
        return [] as MouCollectionAsset[]
      }
      
      try {
        const results = await MouGameIconsClient.searchIcons(filters.searchTerms, page, options)
        for(const result of results.icons) {
          assets.push(new MouCollectionGameIconsAsset(result))
        }
        this.currentHits = results.count
      } catch(error) {
        this.error = MouCollectionGameIcons.ERROR_SERVER_CNX
        MouApplication.logError(this.APP_NAME, `Not able to search icons on game-icons.net`, error)
      }
    }
    return assets
  }

  getActions(asset: MouCollectionAsset): MouCollectionAction[] {
    const actions = [] as MouCollectionAction[]
    const assetType = MouCollectionAssetTypeEnum[asset.type]
    actions.push({ id: GameIconsAssetAction.DRAG, small: true, drag: true, name: (game as Game).i18n.format("MOU.action_drag", { type: assetType}), icon: "fa-solid fa-hand" })
    if(MouFoundryUtils.userCanUpload()) {
      actions.push({ id: GameIconsAssetAction.CLIPBOARD, small: true, name: (game as Game).i18n.localize("MOU.action_clipboard"), icon: "fa-solid fa-clipboard" })
    }
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
        const adv_settings = MouApplication.getSettings(SETTINGS_ADVANCED) as AnyDict
        const bgColor = adv_settings.image?.bgcolor
        const fgColor = adv_settings.image?.fgcolor
        const imagePath = await MouGameIconsClient.downloadIcon(asset.id, fgColor, bgColor)
        if(imagePath) {
          MouMediaUtils.copyToClipboard(imagePath)
        }
        break
    }
  }

  async fromDropData(assetId: string, data: MouCollectionDragData): Promise<void> {
    console.log(assetId, data)
  }

  async dropDataCanvas(canvas: Canvas, selAsset: MouCollectionAsset, data: AnyDict): Promise<void> {
    selAsset; // unused
    const position = {x: data.x, y: data.y }
    const adv_settings = MouApplication.getSettings(SETTINGS_ADVANCED) as AnyDict
    const bgColor = adv_settings.image?.bgcolor || "#000000"
    const fgColor = adv_settings.image?.fgcolor || "#ffffff"
    const imagePath = await MouGameIconsClient.downloadIcon(data.moulinette.asset, fgColor, bgColor)
    if(imagePath) {
      MouFoundryUtils.createCanvasAsset(canvas, imagePath, "Image", `Moulinette/Game Icons`, position)
    }
  }

  isConfigurable(): boolean {
    return false
  }

  isBrowsable(): boolean {
    return false
  }

  configure(callback: Function): void {
    console.log(callback)
  }

  getCollectionError(): string | null {
    if(this.error == MouCollectionGameIcons.ERROR_SERVER_CNX) {
      return (game as Game).i18n.localize("MOU.error_gameicons_connection")
    }
    return null;
  }

  supportsType(type: MouCollectionAssetTypeEnum): boolean {
    return type == MouCollectionAssetTypeEnum.Image
  }

  async selectAsset(asset: MouCollectionAsset): Promise<string | null> {
    return await MouGameIconsClient.downloadIcon(asset.id, "#ffffff", "#000000")
  }

  setPickerMode(pickerMode: boolean) {
    pickerMode; // unused
  }
}
