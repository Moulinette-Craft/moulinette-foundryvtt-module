import MouApplication from "../apps/application";
import MouBrowser from "../apps/browser";
import { MouCollection, MouCollectionAction, MouCollectionActionHint, MouCollectionAsset, MouCollectionAssetMeta, MouCollectionAssetType, MouCollectionAssetTypeEnum, MouCollectionCreator, MouCollectionDragData, MouCollectionFilters, MouCollectionPack, MouCollectionSearchResults } from "../apps/collection";
import { MouBBCSoundsClient } from "../clients/bbc-sounds";
import { AnyDict } from "../types";
import MouFoundryUtils from "../utils/foundry-utils";
import MouMediaUtils from "../utils/media-utils";

enum BBCAssetAction {
  PREVIEW,                  // preview audio
  IMPORT,                   // import asset (audio)
  DRAG,                     // drag & drop capability for the asset
  CLIPBOARD,                // copy path to clipboard
}

class MouCollectionBBCAsset implements MouCollectionAsset {
  
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

  constructor(asset: AnyDict) {
    this.id = asset.id
    this.url = `https://sound-effects-media.bbcrewind.co.uk/mp3/${asset.id}.mp3`
    this.previewUrl = this.url
    this.type = MouCollectionAssetTypeEnum.Audio
    this.format = "large"
    this.creator = `BBC Sound Effects (bbc.co.uk – © copyright ${new Date().getFullYear()} BBC)`
    this.creatorUrl = "https://sound-effects.bbcrewind.co.uk"
    this.draggable = true
    this.pack = null
    this.pack_id = null
    this.name = asset.description
    this.meta = [] as MouCollectionAssetMeta[]
    this.icon = null
    this.flags = {}

    if(asset.duration) {
      this.meta.push({ 
        icon: "fa-regular fa-stopwatch", 
        text: MouMediaUtils.prettyDuration(asset.duration / 1000),
        hint: (game as Game).i18n.localize("MOU.meta_audio_duration")
      })
    }

    if(asset.fileSizes?.mp3FileSize) {
      this.meta.push({ 
        icon: "fa-regular fa-weight-hanging",
        text: MouMediaUtils.prettyFilesize(asset.fileSizes.mp3FileSize, 0),
        hint: (game as Game).i18n.localize("MOU.meta_filesize")})
    }
  }
}

export default class MouCollectionBBCSounds implements MouCollection {
  
  APP_NAME = "MouCollectionBBCSound"
  static PLAYLIST_NAME = "BBC Sounds Effects"

  static ERROR_SERVER_CNX = 1

  private curPreview?: string
  private currentHits: number = 0
  private error: number = 0

  getId(): string {
    return "mou-bbc-sounds"
  }
  
  getName(): string {
    return (game as Game).i18n.localize("MOU.collection_type_bbc_sounds");
  }

  getDescription(): string {
    return (game as Game).i18n.localize("MOU.collection_type_bbc_desc");
  }

  async initialize(): Promise<void> {
    // do nothing
  }
  
  getSupportedTypes(): MouCollectionAssetTypeEnum[] {
    return [MouCollectionAssetTypeEnum.Audio]
  }

  /**
   * Game Icons are exclusively images.
   */
  async getTypes(): Promise<MouCollectionAssetType[]> {
    const results = [] as MouCollectionAssetType[]
    results.push({ id: MouCollectionAssetTypeEnum.Audio, assetsCount: 0 })
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

  async searchAssets(filters: MouCollectionFilters, page: number): Promise<MouCollectionSearchResults> {
    return {
      types: await this.getTypes(),
      creators: await this.getCreators(),
      packs: await this.getPacks(),
      assets: await this.getAssets(filters, page)
    }
  }

  async getAssets(filters: MouCollectionFilters, page: number): Promise<MouCollectionAsset[]> {
    const assets = [] as MouCollectionBBCAsset[]
    if(filters.searchTerms && filters.searchTerms.length > 0) {
      // if max page reached, return empty array
      if(page > 0 && page * MouBrowser.PAGE_SIZE > this.currentHits) {
        return [] as MouCollectionAsset[]
      }
      try {
        const results = await MouBBCSoundsClient.searchAudio(filters.searchTerms, page)
        for(const result of results.sounds) {
          assets.push(new MouCollectionBBCAsset(result))
        }
        this.currentHits = results.count
      } catch(error) {
        this.error = MouCollectionBBCSounds.ERROR_SERVER_CNX
        MouApplication.logError(this.APP_NAME, `Not able to get sounds from BBC Sound Effects`, error)
      }
    }
    return assets
  }

  getActions(asset: MouCollectionAsset): MouCollectionAction[] {
    const isGM = (game as Game).user?.isGM
    const actions = [] as MouCollectionAction[]
    const assetType = MouCollectionAssetTypeEnum[asset.type]
    if(isGM) {
      actions.push({ id: BBCAssetAction.IMPORT, name: (game as Game).i18n.localize("MOU.action_audio_play"), icon: "fa-solid fa-play-pause" })
    }
    actions.push({ id: BBCAssetAction.PREVIEW, name: (game as Game).i18n.localize("MOU.action_preview"), icon: "fa-solid fa-headphones" })
    actions.push({ id: BBCAssetAction.DRAG, small: true, drag: true, name: (game as Game).i18n.format("MOU.action_drag", { type: assetType}), icon: "fa-solid fa-hand" })
    actions.push({ id: BBCAssetAction.CLIPBOARD, small: true, name: (game as Game).i18n.localize("MOU.action_clipboard"), icon: "fa-solid fa-clipboard" })
    return actions
  }

  getActionHint(asset: MouCollectionAsset, actionId: number): MouCollectionActionHint | null {
    const action = this.getActions(asset).find(a => a.id == actionId)
    if(!action) return null
    switch(actionId) {
      case BBCAssetAction.DRAG: return { name: action.name, description: (game as Game).i18n.localize("MOU.action_hint_drag_image") }
      case BBCAssetAction.CLIPBOARD: return { name: action.name, description: (game as Game).i18n.localize("MOU.action_hint_clipboard") }
      case BBCAssetAction.PREVIEW: return { name: action.name, description: (game as Game).i18n.localize("MOU.action_hint_preview_audio_full") }
    }
    return null
  }

  async executeAction(actionId: number, asset: MouCollectionAsset): Promise<void> {
    //const folderPath = `Moulinette/BBC Sound Effects`
    switch(actionId) {
      case BBCAssetAction.DRAG:
        ui.notifications?.info((game as Game).i18n.localize("MOU.dragdrop_instructions"))
        break
      
      case BBCAssetAction.CLIPBOARD:
        MouMediaUtils.copyToClipboard(asset.url)
        break
      
      case BBCAssetAction.IMPORT:
        MouFoundryUtils.playStopSound(asset.url, MouCollectionBBCSounds.PLAYLIST_NAME, asset.name);
        break

      case BBCAssetAction.PREVIEW:
        const audio_url = asset.url
        // assuming there is an audio preview and there is a audio#audiopreview element on the page
        const audio = $("#audiopreview")[0] as HTMLAudioElement
        if(this.curPreview == audio_url) {
          audio.pause()
          this.curPreview = ""
        }
        else {
          this.curPreview = audio_url
          audio.src = audio_url
          audio.play();
        }
        break
    }
  }

  async fromDropData(assetId: string, data: MouCollectionDragData): Promise<void> {
    console.log(assetId, data)
  }

  async dropDataCanvas(canvas: Canvas, selAsset: MouCollectionAsset, data: AnyDict): Promise<void> {
    const position = {x: data.x, y: data.y }
    MouFoundryUtils.createCanvasAsset(canvas, selAsset.url, "Audio", `Moulinette/Game Icons`, position)
  }

  isConfigurable(): boolean {
    return false
  }

  isBrowsable(): boolean {
    return false;
  }

  configure(callback: Function): void {
    console.log(callback)
  }

  getCollectionError(): string | null {
    if(this.error == MouCollectionBBCSounds.ERROR_SERVER_CNX) {
      return (game as Game).i18n.localize("MOU.error_bbcsounds_connection")
    }
    return null;
  }

  supportsType(type: MouCollectionAssetTypeEnum): boolean {
    return type == MouCollectionAssetTypeEnum.Audio
  }

  async selectAsset(asset: MouCollectionAsset): Promise<string | null> {
    return asset.url
  }

  setPickerMode(pickerMode: boolean) {
    pickerMode; // unused
  }
}
