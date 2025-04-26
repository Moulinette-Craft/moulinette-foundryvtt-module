import MouBrowser from "../apps/browser";
import { MouCollection, MouCollectionAction, MouCollectionActionHint, MouCollectionAsset, MouCollectionAssetMeta, MouCollectionAssetType, MouCollectionAssetTypeEnum, MouCollectionCreator, MouCollectionDragData, MouCollectionFilters, MouCollectionPack, MouCollectionSearchResults } from "../apps/collection";
import MouPreview from "../apps/preview";
import MouLocalClient from "../clients/moulinette-local";
import MouConfig from "../constants";
import { AnyDict } from "../types";
import MouFileManager from "../utils/file-manager";
import MouFoundryUtils from "../utils/foundry-utils";
import MouMediaUtils from "../utils/media-utils";
import LocalCollectionConfig from "./config/collection-local-index-config";

enum LocalAssetAction {
  DRAG,                     // drag & drop capability for the asset
  CLIPBOARD,                // copy path to clipboard
  IMPORT,                   // import asset (audio)
  CREATE_ARTICLE,           // create article from asset
  PREVIEW,                  // preview audio
}

class MouCollectionLocalAsset implements MouCollectionAsset {
  
  id: string;
  url: string;
  type: number;
  format: string;
  previewUrl: string;
  creator: string | null;
  creatorUrl: string | null;
  pack: string;
  pack_id: string;
  name: string;
  meta: MouCollectionAssetMeta[];
  icon: string | null;
  icons?: {descr: string, icon: string}[];
  draggable?: boolean;
  animated: boolean;
  flags: AnyDict;
  
  constructor(data: AnyDict, pack: AnyDict, idx: number, baseUrl: string) {
    let assetType : MouCollectionAssetTypeEnum
    this.animated = false
    const ext = data.path.split(".").pop()?.toLocaleLowerCase() as string;
    if(MouConfig.MEDIA_IMAGES.includes(ext)) {
      if(MouMediaUtils.isMap(data.width, data.height)) {
        assetType = MouCollectionAssetTypeEnum.Map
      } else {
        assetType = MouCollectionAssetTypeEnum.Image
      }
    } else if (MouConfig.MEDIA_VIDEOS.includes(ext)) {
      this.animated = !(pack.options && pack.options.thumbs)
      if(MouMediaUtils.isMap(data.width, data.height)) {
        assetType = MouCollectionAssetTypeEnum.Map
      } else {
        assetType = MouCollectionAssetTypeEnum.Image
      }
    } else if (MouConfig.MEDIA_AUDIO.includes(ext)) {
      assetType = MouCollectionAssetTypeEnum.Audio
    } else {
      assetType = MouCollectionAssetTypeEnum.Undefined
    }
    
    let thumbPath = baseUrl + `${MouConfig.MOU_DEF_THUMBS}/` + data.path.substring(baseUrl.length, data.path.lastIndexOf(".")) + ".webp" 
    // if the file is a SVG, we use the original file as thumbnail
    if(ext == "svg") {
      thumbPath = data.path
    }
    
    this.id = String(idx)
    this.url = MouMediaUtils.encodeURL(data.path);
    this.format = assetType == MouCollectionAssetTypeEnum.Map ? "large" : (assetType == MouCollectionAssetTypeEnum.Image ? "tiny" : "small")
    this.previewUrl = MouMediaUtils.encodeURL(pack.options && pack.options.thumbs ? thumbPath : data.path),
    this.creator = null
    this.creatorUrl = null
    this.pack = pack.name
    this.pack_id = pack.id
    this.name = MouMediaUtils.prettyMediaName(data.path)
    this.type = assetType
    this.meta = []
    this.draggable = assetType != MouCollectionAssetTypeEnum.Map
    this.icon = MouMediaUtils.getIcon(assetType)
    this.icons = []
    this.flags = {}

    if(data.width && data.height && data.width) {
      this.meta.push({ 
        icon: "fa-regular fa-expand-wide", 
        text: `${data.width} x ${data.height}`,
        hint: (game as Game).i18n.localize("MOU.meta_media_size")
      })
    }
    if(data.duration) {
      this.meta.push({ 
        icon: "fa-regular fa-stopwatch", 
        text: MouMediaUtils.prettyDuration(data.duration),
        hint: (game as Game).i18n.localize("MOU.meta_audio_duration")
      })
    }
  }
}

export default class MouCollectionLocal implements MouCollection {

  APP_NAME = "MouCollectionLocal"

  static PLAYLIST_NAME = "Moulinette Local"
  
  private curPreview?: string
  private assets: AnyDict

  constructor() {
    this.assets = {}
  }

  getId(): string {
    return "mou-local"
  }

  async initialize(): Promise<void> {
    let assets : AnyDict = {}
    try {
      assets = await MouLocalClient.getAllAssets()
    } catch(err) {
      console.warn("MouCollectionLocal | Cannot load local index", err)
    }
    let idx = 0
    for(const packId of Object.keys(assets)) {
      const results = [] as MouCollectionAsset[]
      const pack = assets[packId]
      const source = pack.id.split("#").pop()
      const baseUrl = await MouFileManager.getBaseURL(source) || ""    
      // replace raw assets by MouCollectionAsset
      for(const a of pack.assets) {
        results.push(new MouCollectionLocalAsset(a, pack, ++idx, baseUrl))
      }
      pack.assets = results
    }
    this.assets = assets
  }


  /**
   * Retrieves an asset by its unique identifier.
   *
   * @param id - The unique identifier of the asset to retrieve.
   * @returns The asset if found, otherwise `null`.
   */
  getAssetById(id: string): MouCollectionAsset | null {
    for(const packId of Object.keys(this.assets)) {
      const asset = this.assets[packId].assets.find((a: MouCollectionLocalAsset) => a.id == id)
      if(asset) return asset
    }
    return null
  }

  getName(): string {
    return (game as Game).i18n.localize("MOU.collection_type_local");
  }

  getDescription(): string {
    return (game as Game).i18n.localize("MOU.collection_type_local_desc");
  }

  getSupportedTypes(): MouCollectionAssetTypeEnum[] {
    return [
      MouCollectionAssetTypeEnum.Image, 
      MouCollectionAssetTypeEnum.Audio, 
      MouCollectionAssetTypeEnum.Map
    ];
  }

  /**
   * Types are generated based on file extensions
   */
  async getTypes(): Promise<MouCollectionAssetType[]> {
    const results = [] as MouCollectionAssetType[]
    
    let images = 0
    let maps = 0
    let audio = 0
    for(const pack of Object.values(this.assets)) {
      images += pack.assets.filter((a: MouCollectionLocalAsset) => a.type == MouCollectionAssetTypeEnum.Image).length
      maps += pack.assets.filter((a: MouCollectionLocalAsset) => a.type == MouCollectionAssetTypeEnum.Map).length
      audio += pack.assets.filter((a: MouCollectionLocalAsset) => a.type == MouCollectionAssetTypeEnum.Audio).length
    }
    if(images > 0) results.push({ id: MouCollectionAssetTypeEnum.Image, assetsCount: images })
    if(maps > 0)   results.push({ id: MouCollectionAssetTypeEnum.Map, assetsCount: maps })
    if(audio > 0)  results.push({ id: MouCollectionAssetTypeEnum.Audio, assetsCount: audio })

    return results
  }

  /**
   * Local assets don't have any creator, only packs (sources)
   */
  async getCreators(): Promise<MouCollectionCreator[]> {
    return [] as MouCollectionCreator[]
  }

  async getPacks(filters: MouCollectionFilters): Promise<MouCollectionPack[]> {
    const packs = [] as MouCollectionPack[]
    for(const packId of Object.keys(this.assets)) {
      const pack = this.assets[packId]
      packs.push({
        id: packId,
        name: pack.name,
        assetsCount: pack.assets.filter((a: MouCollectionLocalAsset) => a.type == filters.type).length
      })
    }
    return packs;
  }

  /**
   * Generates a list of collection assets based on provided filters
   */
  private async getAllResults(filters: MouCollectionFilters): Promise<MouCollectionAsset[]> {
    const results = [] as MouCollectionAsset[]
    const filterFolder = filters.folder && filters.folder.length ? MouMediaUtils.encodeURL(filters.folder) : null
    for(const packId of Object.keys(this.assets)) {
      if(!filters.pack || filters.pack == packId) {
        const assets = this.assets[packId].assets.filter((a : MouCollectionLocalAsset) => {
          // filter by type
          if(filters.type != a.type) return false
          // filter by folder
          if(filterFolder && !a.url.startsWith(filterFolder)) return false
          // filter by search
          if(filters.searchTerms) {
            for(const term of filters.searchTerms.toLocaleLowerCase().split(" ")) {
              if(a.url.toLocaleLowerCase().indexOf(term) < 0) {
                return false
              }
            }
          }
          return true
        })
        for (const asset of assets) {
          results.push(asset)
        }
      }
    }
    return results
  }

  /**
   * Retrieves a list of unique folder paths based on the provided filters.
   *
   * @param {MouCollectionFilters} filters - The filters to apply when retrieving folders.
   * @returns {Promise<string[]>} A promise that resolves to an array of unique folder paths, sorted alphabetically.
   */
  async getFolders(filters: MouCollectionFilters): Promise<string[]> {
    if(!filters.pack) return []
    const folders = new Set<string>()
    // generate list of folders
    const results = await this.getAllResults({ type: filters.type, pack: filters.pack })
    for(const r of results) {
      const f = r.url.substring(0, r.url.lastIndexOf('/'));
      if(f.length > 0) {
        folders.add(MouMediaUtils.getCleanURI(f))
      }
    }
    return Array.from(folders.values()).sort((a, b) => a.localeCompare(b))
  }

  async getAssetsCount(filters: MouCollectionFilters): Promise<number> {
    return (await this.getAllResults(filters)).length
  }

  async getAssets(filters: MouCollectionFilters, page: number): Promise<MouCollectionAsset[]> {
    const results = await this.getAllResults(filters)
    const fromIdx = page * MouBrowser.PAGE_SIZE
    if(fromIdx >= results.length) return []
    return results.slice(fromIdx, fromIdx + MouBrowser.PAGE_SIZE)
  }

  async searchAssets(filters: MouCollectionFilters, page: number): Promise<MouCollectionSearchResults> {
    return {
      types: await this.getTypes(),
      creators: await this.getCreators(),
      packs: await this.getPacks(filters),
      assets: await this.getAssets(filters, page)
    }
  }

  getActions(asset: MouCollectionAsset): MouCollectionAction[] {
    const isGM = (game as Game).user?.isGM
    const actions = [] as MouCollectionAction[]
    const cAsset = (asset as MouCollectionLocalAsset)
    const assetType = MouCollectionAssetTypeEnum[asset.type]
    switch(cAsset.type) {
      case MouCollectionAssetTypeEnum.Image:
        if(isGM) {
          actions.push({ id: LocalAssetAction.DRAG, small: true, drag: true, name: (game as Game).i18n.format("MOU.action_drag", { type: assetType}), icon: "fa-solid fa-hand" })
          actions.push({ id: LocalAssetAction.CREATE_ARTICLE, small: true,name: (game as Game).i18n.localize("MOU.action_create_article"), icon: "fa-solid fa-book-open" })
        }
        actions.push({ id: LocalAssetAction.PREVIEW, small: true, name: (game as Game).i18n.localize("MOU.action_preview_asset"), icon: "fa-solid fa-eyes" })
        break;    
      case MouCollectionAssetTypeEnum.Map:
        if(isGM) {
          actions.push({ id: LocalAssetAction.IMPORT, name: (game as Game).i18n.format("MOU.action_import", { type: assetType}), icon: "fa-solid fa-file-import" })
          actions.push({ id: LocalAssetAction.CREATE_ARTICLE, name: (game as Game).i18n.localize("MOU.action_create_article"), icon: "fa-solid fa-book-open" })
        }
        actions.push({ id: LocalAssetAction.PREVIEW, small: true, name: (game as Game).i18n.localize("MOU.action_preview_asset"), icon: "fa-solid fa-eyes" })
        break;    
      case MouCollectionAssetTypeEnum.Audio:
        if(isGM) {
          actions.push({ id: LocalAssetAction.DRAG, drag: true, name: (game as Game).i18n.format("MOU.action_drag", { type: assetType}), icon: "fa-solid fa-hand" })
          actions.push({ id: LocalAssetAction.IMPORT, name: (game as Game).i18n.localize("MOU.action_audio_play"), icon: "fa-solid fa-play-pause" })
        }
        actions.push({ id: LocalAssetAction.PREVIEW, name: (game as Game).i18n.localize("MOU.action_preview"), icon: "fa-solid fa-headphones" })
        break;   
      case MouCollectionAssetTypeEnum.PDF:
        if(isGM) {
          actions.push({ id: LocalAssetAction.CREATE_ARTICLE, name: (game as Game).i18n.localize("MOU.action_create_article"), icon: "fa-solid fa-book-open" })
        }
        break;    
    }
    actions.push({ id: LocalAssetAction.CLIPBOARD, small: true, name: (game as Game).i18n.localize("MOU.action_clipboard"), icon: "fa-solid fa-clipboard" })
    
    return actions
  }

  getActionHint(asset: MouCollectionAsset, actionId: number): MouCollectionActionHint | null {
    const action = this.getActions(asset).find(a => a.id == actionId)
    if(!action) return null
    switch(actionId) {
      case LocalAssetAction.DRAG:
        switch(asset.type) {
          case MouCollectionAssetTypeEnum.Map:
          case MouCollectionAssetTypeEnum.Image: return { name: action.name, description: (game as Game).i18n.localize("MOU.action_hint_drag_image") }
          case MouCollectionAssetTypeEnum.Audio: return { name: action.name, description: (game as Game).i18n.localize("MOU.action_hint_drag_audio") }
        }
        break
      case LocalAssetAction.IMPORT:
        switch(asset.type) {
          case MouCollectionAssetTypeEnum.Map: return { name: action.name, description: (game as Game).i18n.localize("MOU.action_hint_import_image") }
          case MouCollectionAssetTypeEnum.Audio: return { name: action.name, description: (game as Game).i18n.localize("MOU.action_hint_import_audio") }
        }
        break
      case LocalAssetAction.CLIPBOARD:
        return { name: action.name, description: (game as Game).i18n.localize("MOU.action_hint_clipboard") }
      case LocalAssetAction.CREATE_ARTICLE:
        return { name: action.name, description: (game as Game).i18n.localize("MOU.action_hint_create_article_asset") }
      case LocalAssetAction.PREVIEW:
        switch(asset.type) {
          case MouCollectionAssetTypeEnum.Audio: return { name: action.name, description: (game as Game).i18n.localize("MOU.action_hint_preview_audio_full") }
          case MouCollectionAssetTypeEnum.Image: 
          case MouCollectionAssetTypeEnum.Map: 
            return { name: action.name, description: (game as Game).i18n.localize("MOU.action_hint_preview_asset") }
        }
        break
    }
    return null
  }

  async executeAction(actionId: number, asset: MouCollectionAsset): Promise<void> {
    const folderPath = `Moulinette/Local Assets/${asset.pack}`
    switch(actionId) {
      case LocalAssetAction.DRAG:
        ui.notifications?.info((game as Game).i18n.localize("MOU.dragdrop_instructions"))
        break
      
      case LocalAssetAction.CLIPBOARD:
        MouMediaUtils.copyToClipboard(asset.url)
        break

      case LocalAssetAction.IMPORT:
        switch(asset.type) {
          case MouCollectionAssetTypeEnum.Map:
            MouFoundryUtils.importSceneFromMap(asset.url, folderPath)
            break
          case MouCollectionAssetTypeEnum.Audio:
            MouFoundryUtils.playStopSound(asset.url, MouCollectionLocal.PLAYLIST_NAME);
            break
        }
        break

      case LocalAssetAction.CREATE_ARTICLE:
        switch(asset.type) {
          case MouCollectionAssetTypeEnum.Map: 
          case MouCollectionAssetTypeEnum.Image: 
            MouFoundryUtils.createJournalImageOrVideo(asset.url, folderPath);
            break
          case MouCollectionAssetTypeEnum.PDF:
            MouFoundryUtils.createJournalPDF(asset.url, folderPath); 
              break
        }
        break
      
      case LocalAssetAction.PREVIEW:
        switch(asset.type) {
          case MouCollectionAssetTypeEnum.Audio:
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
          case MouCollectionAssetTypeEnum.Image:
          case MouCollectionAssetTypeEnum.Map:
              (new MouPreview(asset.url)).render(true)
              break;
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
    const asset = this.getAssetById(data.moulinette.asset)
    if(!asset) return
    MouFoundryUtils.createCanvasAsset(canvas, asset.url, data.type, `Moulinette/Local Assets/${asset.pack}`, position)
  }

  isConfigurable(): boolean {
    return true;
  }

  isBrowsable(): boolean {
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

  getCollectionError(): string | null {
    return null;
  }
  
  supportsType(type: MouCollectionAssetTypeEnum): boolean {
    return [
      MouCollectionAssetTypeEnum.Audio, 
      MouCollectionAssetTypeEnum.Image, 
      MouCollectionAssetTypeEnum.Map,
      MouCollectionAssetTypeEnum.PDF].includes(type)
  }

  async selectAsset(asset: MouCollectionAsset): Promise<string | null> {
    return asset.url;
  }
}
