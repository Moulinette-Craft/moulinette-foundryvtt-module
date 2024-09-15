import MouBrowser from "../apps/browser";
import { MouCollection, MouCollectionAction, MouCollectionActionHint, MouCollectionAsset, MouCollectionAssetMeta, MouCollectionAssetType, MouCollectionAssetTypeEnum, MouCollectionCreator, MouCollectionDragData, MouCollectionFilters, MouCollectionPack } from "../apps/collection";
import MouLocalClient from "../clients/moulinette-local";
import { MEDIA_AUDIO, MEDIA_IMAGES } from "../constants";
import { AnyDict } from "../types";
import MouFoundryUtils from "../utils/foundry-utils";
import MouMediaUtils from "../utils/media-utils";
import LocalCollectionConfig from "./collection-local-index-config";

enum LocalAssetAction {
  DRAG,                     // drag & drop capability for the asset
  CLIPBOARD,                // copy path to clipboard
  IMPORT,                   // import asset (audio)
  CREATE_ARTICLE,           // create article from asset
  PREVIEW,                  // preview audio
}

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
    this.id = data.path;
    this.format = "small"
    this.preview = data.path,
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
  
  private curPreview?: string
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

  /**
   * Types are generated based on file extensions
   */
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

  /**
   * Local assets don't have any creator, only packs (sources)
   */
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

  /**
   * Generates a list of collection assets based on provided filters
   */
  private async getAllResults(filters: MouCollectionFilters): Promise<MouCollectionAsset[]> {
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
          // filter by folder
          if(filters.folder && filters.folder.length > 0 && !a.path.startsWith(filters.folder)) return false
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
    return results
  }

  async getFolders(filters: MouCollectionFilters): Promise<string[]> {
    const folders = new Set<string>()
    // generate list of folders
    const results = await this.getAllResults({ type: filters.type, pack: filters.pack })
    for(const r of results) {
      const f = r.id.substring(0, r.id.lastIndexOf('/'));
      if(f.length > 0) {
        folders.add(f)
      }
    }
    return Array.from(folders.values()).sort((a, b) => a.localeCompare(b))
  }

  async getAssets(filters: MouCollectionFilters, page: number): Promise<MouCollectionAsset[]> {
    const results = await this.getAllResults(filters)
    const fromIdx = page * MouBrowser.PAGE_SIZE
    if(fromIdx >= results.length) return []
    return results.slice(fromIdx, fromIdx + MouBrowser.PAGE_SIZE)
  }

  getRandomAssets(filters: MouCollectionFilters): Promise<MouCollectionAsset[]> {
    throw new Error("Method not implemented." + filters);
  }

  getActions(asset: MouCollectionAsset): MouCollectionAction[] {
    const actions = [] as MouCollectionAction[]
    const cAsset = (asset as MouCollectionLocalAsset)
    const assetType = MouCollectionAssetTypeEnum[asset.type]
    actions.push({ id: LocalAssetAction.DRAG, drag: true, name: (game as Game).i18n.format("MOU.action_drag", { type: assetType}), icon: "fa-solid fa-hand" })
    switch(cAsset.type) {
      case MouCollectionAssetTypeEnum.Image:
        actions.push({ id: LocalAssetAction.CREATE_ARTICLE, name: (game as Game).i18n.localize("MOU.action_create_article"), icon: "fa-solid fa-book-open" })
        break;    
      case MouCollectionAssetTypeEnum.Audio:
        actions.push({ id: LocalAssetAction.IMPORT, name: (game as Game).i18n.localize("MOU.action_audio_play"), icon: "fa-solid fa-play-pause" })
        actions.push({ id: LocalAssetAction.PREVIEW, name: (game as Game).i18n.localize("MOU.action_preview"), icon: "fa-solid fa-headphones" })
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
          case MouCollectionAssetTypeEnum.Image: return { name: action.name, description: (game as Game).i18n.localize("MOU.action_hint_drag_image") }
          case MouCollectionAssetTypeEnum.Audio: return { name: action.name, description: (game as Game).i18n.localize("MOU.action_hint_drag_audio") }
        }
        break
      case LocalAssetAction.IMPORT:
        switch(asset.type) {
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
        MouMediaUtils.copyToClipboard(asset.preview)
        break

      case LocalAssetAction.IMPORT:
        switch(asset.type) {
          case MouCollectionAssetTypeEnum.Audio:
            MouFoundryUtils.playStopSound(asset.preview, MouCollectionLocal.PLAYLIST_NAME);
        }
        break

      case LocalAssetAction.CREATE_ARTICLE:
        switch(asset.type) {
          case MouCollectionAssetTypeEnum.Image: 
            MouFoundryUtils.createJournalImage(asset.preview, folderPath);
            break
        }
        break
      
      case LocalAssetAction.PREVIEW:
        switch(asset.type) {
          case MouCollectionAssetTypeEnum.Audio:
            const audio_url = asset.preview
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
        break
    }
  }

  async fromDropData(assetId: string, data: MouCollectionDragData): Promise<void> {
    console.log(assetId, data)
  }

  async dropDataCanvas(canvas: Canvas, data: AnyDict): Promise<void> {
    const activeLayer = canvas.layers.find((l : AnyDict) => l.active)?.name
    const position = {x: data.x, y: data.y }
    if(data.type == "Image") {
      if(activeLayer == "NotesLayer") {
        MouFoundryUtils.createNoteImage(canvas, `Moulinette/Local Assets/Dropped`, data.moulinette.asset, position)
      } else {
        MouFoundryUtils.createTile(canvas, data.moulinette.asset, position)
      }
    } else if(data.type == "Audio") {
      MouFoundryUtils.createAmbientAudio(canvas, data.moulinette.asset, position)
    }
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
