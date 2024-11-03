import MouBrowser from "../apps/browser";
import { MouCollection, MouCollectionAction, MouCollectionActionHint, MouCollectionAsset, MouCollectionAssetMeta, MouCollectionAssetType, MouCollectionAssetTypeEnum, MouCollectionCreator, MouCollectionDragData, MouCollectionFilters, MouCollectionPack } from "../apps/collection";
import { MODULE_ID } from "../constants";
import { AnyDict } from "../types";

enum FontAwesomeAssetAction {
  CLIPBOARD,                // copy path to clipboard
}

class MouCollectionFontAwesomeAsset implements MouCollectionAsset {
  
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

  constructor(icon: string, family: string, style?: string) {
    this.url = `fa-${icon}`
    if(style && style.length > 0) {
      this.url = `fa-${style} ${this.url}`
    }
    if(family != "classic") {
      this.url = `fa-${family} ${this.url}`
    }
    this.id = this.url
    this.previewUrl = this.url
    this.type = MouCollectionAssetTypeEnum.Icon
    this.format = "tiny"
    this.creator = "FontAwesome"
    this.creatorUrl = "https://fontawesome.com"
    this.pack = null
    this.pack_id = null
    this.name = icon
    this.meta = [] as MouCollectionAssetMeta[]
    this.icon = null
    this.draggable = true
    this.flags = {}
  }
}

export default class MouCollectionFontAwesome implements MouCollection {
  
  APP_NAME = "MouCollectionFontAwesome"
  
  private iconList: AnyDict = {}
  private currentCount: number = 0

  getId(): string {
    return "mou-fontawesome"
  }
  
  getName(): string {
    return (game as Game).i18n.localize("MOU.collection_type_fontawesome");
  }

  async initialize(): Promise<void> {
    const response = await fetch(`modules/${MODULE_ID}/data/fa-icons.json`);
    this.iconList = await response.json();
    console.log(this.iconList)
  }
  
  /**
   * Game Icons are exclusively images.
   */
  async getTypes(): Promise<MouCollectionAssetType[]> {
    return [{ id: MouCollectionAssetTypeEnum.Icon, assetsCount: await this.getTotalAssetsCount() }]
  }

  async getCreators(): Promise<MouCollectionCreator[]> {
    const creators = [] as MouCollectionCreator[]
    if(Object.keys(this.iconList).length > 0) {
      for(const family of Object.keys(this.iconList)) {
        let count = 0
        for(const icon of this.iconList[family]) {
          count += icon.styles.length
        }
        creators.push({
          id: family,
          name: family,
          assetsCount: count
        })
      }
    }
    return creators
  }

  async getPacks(filters: MouCollectionFilters): Promise<MouCollectionPack[]> {
    if(!filters.creator || filters.creator.length == 0) return [];
    const packs = [] as MouCollectionPack[]
    const icons = this.iconList[filters.creator]
    const styles = {} as AnyDict;
    for(const icon of icons) {
      for (const style of icon.styles) {
        if(style in styles) {
          styles[style]++
        } else {
          styles[style] = 1
        }
      }
    }
    for(const style of Object.keys(styles).sort()) {
      packs.push({
        id: style as string,
        name: style as string,
        assetsCount: styles[style]
      })
    }
    return packs
  }

  async getFolders(): Promise<string[]> {
    return [] as string[]
  }

  async getAssetsCount(): Promise<number> {
    return this.currentCount
  }

  async getTotalAssetsCount(): Promise<number> {
    let total = 0
    for(const family of Object.keys(this.iconList)) {
      for(const icon of this.iconList[family]) {
        total += icon.styles.length
      }
    }
    return total
  }

  async getAssets(filters: MouCollectionFilters, page: number): Promise<MouCollectionAsset[]> {
    filters; page; // unused
    const assets = [] as MouCollectionFontAwesomeAsset[]

    for(const family of Object.keys(this.iconList)) {
      if(filters.creator && filters.creator != family) continue
      for(const icon of this.iconList[family]) {
        if(filters.searchTerms) {
          let found = true
          for(const term of filters.searchTerms.toLocaleLowerCase().split(" ")) {
            if(icon.id.toLocaleLowerCase().indexOf(term) < 0) {
              found = false; break;
            }
          }
          if(!found) continue
        }
        if(icon.styles.length == 0) {
          assets.push(new MouCollectionFontAwesomeAsset(icon.id, family))
        } else {
          for(const style of icon.styles) {
            if(filters.pack && filters.pack != style) continue
            assets.push(new MouCollectionFontAwesomeAsset(icon.id, family, style))
          }
        }
      }
    }

    this.currentCount = assets.length
    const fromIdx = page * MouBrowser.PAGE_SIZE
    if(fromIdx >= assets.length) return []
    return assets.slice(fromIdx, fromIdx + MouBrowser.PAGE_SIZE)
  }

  getActions(asset: MouCollectionAsset): MouCollectionAction[] {
    asset; // unused
    const actions = [] as MouCollectionAction[]
    actions.push({ id: FontAwesomeAssetAction.CLIPBOARD, small: true, name: (game as Game).i18n.localize("MOU.action_clipboard"), icon: "fa-solid fa-clipboard" })
    return actions
  }

  getActionHint(asset: MouCollectionAsset, actionId: number): MouCollectionActionHint | null {
    const action = this.getActions(asset).find(a => a.id == actionId)
    if(!action) return null
    switch(actionId) {
      case FontAwesomeAssetAction.CLIPBOARD: return { name: action.name, description: (game as Game).i18n.localize("MOU.action_hint_clipboard") }
    }
    return null
  }

  async executeAction(actionId: number, asset: MouCollectionAsset): Promise<void> {
    asset; // unused
    //const folderPath = `Moulinette/Game Icons`
    switch(actionId) {
      case FontAwesomeAssetAction.CLIPBOARD:
        // const imagePath = await MouGameIconsClient.downloadIcon(asset.id, "#ffffff", "#000000")
        // if(imagePath) {
        //   MouMediaUtils.copyToClipboard(imagePath)
        // }
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

  isBrowsable(): boolean {
    return true
  }

  configure(callback: Function): void {
    console.log(callback)
  }

  getCollectionError(): string | null {
    return null;
  }

  supportsType(type: MouCollectionAssetTypeEnum): boolean {
    return type == MouCollectionAssetTypeEnum.Icon
  }

  async selectAsset(asset: MouCollectionAsset): Promise<string | null> {
    asset; // unused
    return null
  }
}
