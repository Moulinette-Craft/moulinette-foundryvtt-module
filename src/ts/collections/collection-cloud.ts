import MouApplication from "../apps/application";
import MouCloudClient from "../clients/moulinette-cloud";
import MouFileManager from "../utils/file-manager";
import MouMediaUtils from "../utils/media-utils";

import { MouCollection, MouCollectionAction, MouCollectionActionHint, MouCollectionAsset, MouCollectionAssetMeta, MouCollectionAssetType, MouCollectionAssetTypeEnum, MouCollectionCreator, MouCollectionDragData, MouCollectionFilters, MouCollectionPack } from "../apps/collection";
import MouConfig, { MOU_STORAGE_PUB, SETTINGS_COLLECTION_CLOUD, SETTINGS_SESSION_ID } from "../constants";
import { AnyDict } from "../types";
import MouFoundryUtils from "../utils/foundry-utils";
import CloudCollectionConfig from "./config/collection-cloud-config";

export enum CloudMode {
  ALL = "cloud-all",                          // all assets including non-accessible
  ALL_ACCESSIBLE = "cloud-accessible",        // all assets the user can access
  ONLY_SUPPORTED_CREATORS = "cloud-supported" // only assets from creators the user actively supports
}

enum CloudAssetType {
  PREVIEW,                  // asset a preview (no access, requires membership)
  FREE,                     // asset is a freebe from creator
  AVAILABLE,                // asset is available (but not free)
}

enum CloudAssetAction {
  DRAG,                     // drag & drop capability for the asset
  DOWNLOAD,                 // download asset and copy path to clipboard
  IMPORT,                   // import asset (scenes/...)
  CREATE_ARTICLE,           // create article from asset
  MEMBERSHIP,               // creator support page,
  PREVIEW,                  // preview audio
}

class MouCollectionCloudAsset implements MouCollectionAsset {
  
  id: string;
  url: string;
  type: number;
  format: string;
  previewUrl: string;
  background_color: string;
  creator: string;
  creatorUrl: string;
  pack: string;
  pack_id: string;
  name: string;
  meta: MouCollectionAssetMeta[];
  icon: string | null;
  icons?: {descr: string, icon: string}[];
  draggable?: boolean;
  flags: AnyDict;

  // specific to MouCollectionCloud
  cloud_type: number; 
  
  constructor(data: AnyDict) {
    this.id = data._id;
    this.format = [MouCollectionAssetTypeEnum.Scene, MouCollectionAssetTypeEnum.Map].includes(data.type) ? "large" : "small"
    const basePath = MouMediaUtils.getBasePath(data.filepath)
    this.url = data.filepath
    this.previewUrl = `${MOU_STORAGE_PUB}${data.pack.creator_ref}/${data.pack.path}/${basePath}.${data.type == MouCollectionAssetTypeEnum.Audio ? "ogg" : "webp"}`
    this.background_color = [MouCollectionAssetTypeEnum.Scene, MouCollectionAssetTypeEnum.Map].includes(data.type) ? data.main_color : null
    this.creator = data.pack.creator
    this.creatorUrl = data.creator_url
    this.pack = data.pack.name
    this.pack_id = data.pack_ref
    this.name = MouMediaUtils.prettyMediaName(data.filepath)
    this.type = data.type;
    this.meta = []
    this.icon = MouMediaUtils.getIcon(data.type)
    this.icons = []
    this.flags = {}

    if(data.perms == 0) {
      this.icons.push({descr: (game as Game).i18n.localize("MOU.pack_is_free"), icon: "fa-solid fa-gift"})
      this.cloud_type = CloudAssetType.FREE
    } else if (data.perms < 0) {
      this.cloud_type = CloudAssetType.PREVIEW
    } else {
      this.cloud_type = CloudAssetType.AVAILABLE
    }
    
    switch(data.type) {
      case MouCollectionAssetTypeEnum.Item:
      case MouCollectionAssetTypeEnum.Actor:
        this.draggable = true
        break
      case MouCollectionAssetTypeEnum.Audio:
        this.draggable = true
        if(data.audio.duration >= 45) {
          this.flags["hasAudioPreview"] = true
          this.meta.push({ 
            icon: "fa-solid fa-headphones", 
            text: "",
            hint: (game as Game).i18n.localize("MOU.meta_audio_has_preview")
          })
        }
        this.meta.push({ 
          icon: "fa-regular fa-stopwatch", 
          text: MouMediaUtils.prettyDuration(data.audio.duration),
          hint: (game as Game).i18n.localize("MOU.meta_audio_duration")
        })
        break
      case MouCollectionAssetTypeEnum.Scene:
        this.meta = []
        if(data.scene.width) {
          this.meta.push({ 
            icon: "fa-regular fa-border-all", 
            text: `${data.scene.width} x ${data.scene.height}`,
            hint: (game as Game).i18n.localize("MOU.meta_scene_dims")
          })
        } else {
          this.meta.push({ 
            icon: "fa-regular fa-expand-wide", 
            text: `${MouMediaUtils.prettyNumber(data.size.width, true)} x ${MouMediaUtils.prettyNumber(data.size.height, true)}`,
            hint: (game as Game).i18n.localize("MOU.meta_media_size")
          })
        }
        if(data.scene.hasWalls) this.icons.push({descr: (game as Game).i18n.localize("MOU.scene_has_walls"), icon: "fa-solid fa-block-brick"})
        if(data.scene.hasLights) this.icons.push({descr: (game as Game).i18n.localize("MOU.scene_has_lights"), icon: "fa-regular fa-lightbulb"})
        if(data.scene.hasSounds) this.icons.push({descr: (game as Game).i18n.localize("MOU.scene_has_sounds"), icon: "fa-solid fa-music"})
        if(data.scene.hasTokens) this.icons.push({descr: (game as Game).i18n.localize("MOU.scene_has_tokens"), icon: "fa-solid fa-user-alt"})
        if(data.scene.hasTiles) this.icons.push({descr: (game as Game).i18n.localize("MOU.scene_has_tiles"), icon: "fa-solid fa-cubes"})
        if(data.scene.hasDrawings) this.icons.push({descr: (game as Game).i18n.localize("MOU.scene_has_drawings"), icon: "fa-solid fa-pencil-alt"})
        if(data.scene.hasNotes) this.icons.push({descr: (game as Game).i18n.localize("MOU.scene_has_notes"), icon: "fa-solid fa-bookmark"})
        break
      case MouCollectionAssetTypeEnum.Image:
        this.draggable = true
      case MouCollectionAssetTypeEnum.Map:  
        this.meta.push({ 
          icon: "fa-regular fa-expand-wide", 
          text: `${MouMediaUtils.prettyNumber(data.size.width, true)} x ${MouMediaUtils.prettyNumber(data.size.height, true)}`,
          hint: (game as Game).i18n.localize("MOU.meta_media_size")
        })
        break
      case MouCollectionAssetTypeEnum.PDF:
        this.meta.push({ 
          icon: "fa-regular fa-file-pdf", 
          text: `${data.pdf.pages} ` + (game as Game).i18n.localize(data.pdf.pages > 1 ? "MOU.pages" : "MOU.page"),
          hint: (game as Game).i18n.localize("MOU.meta_pdf_pages")
        })
        break
    }
    this.meta.push({ 
      icon: "fa-regular fa-weight-hanging",
      text: MouMediaUtils.prettyFilesize(data.filesize, 0),
      hint: (game as Game).i18n.localize("MOU.meta_filesize")})
  }
}

export default class MouCollectionCloud implements MouCollection {

  APP_NAME = "MouCollectionCloud"

  static PLAYLIST_NAME = "Moulinette Cloud"

  private mode: CloudMode

  constructor() {
    this.mode = CloudMode.ALL
    this.refreshSettings();
  }
  
  async initialize(): Promise<void> {
    // nothing to do
  }

  private refreshSettings() {
    const settings = MouApplication.getSettings(SETTINGS_COLLECTION_CLOUD) as AnyDict
    this.mode = "mode" in settings ? settings.mode : CloudMode.ALL
  }
  
  getId() : string {
    return "mou-cloud"
  }
  
  getName(): string {
    switch(this.mode) {
      case CloudMode.ALL : return (game as Game).i18n.localize("MOU.collection_type_cloud_all");
      case CloudMode.ALL_ACCESSIBLE : return (game as Game).i18n.localize("MOU.collection_type_cloud_owned");
      case CloudMode.ONLY_SUPPORTED_CREATORS: return (game as Game).i18n.localize("MOU.collection_type_cloud_supported");
    }
  }

  private getScope() {
    return {
      session: MouApplication.getSettings(SETTINGS_SESSION_ID),
      mode: this.mode
    }
  }

  async getTypes(filters: MouCollectionFilters): Promise<MouCollectionAssetType[]> {
    const filtersDuplicate = JSON.parse(JSON.stringify(filters));
    filtersDuplicate["scope"] = this.getScope()
    filtersDuplicate["pack"] = filtersDuplicate["pack"].length == 0 ? 0 : Number(filtersDuplicate["pack"])
    // returns a dict with key = asset type and value = count
    const results = await MouCloudClient.apiPOST("/assets/types", filtersDuplicate)
    return Object.entries(results).map( entry => { return {
          id: Number(entry[0]),
          assetsCount: entry[1]
        } as MouCollectionAssetType
      })
  }

  async getCreators(type: MouCollectionAssetTypeEnum): Promise<MouCollectionCreator[]> {
    const creators = await MouCloudClient.apiPOST("/creators", { type: type, scope: this.getScope() })
    const results = []
    for(const c of creators) {
      const creator : MouCollectionCreator = {
        id: c.name,
        name: c.name,
        assetsCount: c.assets
      }  
      results.push(creator)
    }
    return results
  }
  
  async getPacks(type: MouCollectionAssetTypeEnum, creator: string): Promise<MouCollectionPack[]> {
    const results = [] as MouCollectionPack[]
    if(creator.length == 0) return results
    const packs = await MouCloudClient.apiPOST("/packs", { type: type, creator: creator, scope: this.getScope() })
    for(const p of packs) {
      const pack : MouCollectionPack = {
        id: String(p.pack_ref),
        name: p.name,
        assetsCount: p.assets
      }  
      results.push(pack)
    }
    return results
  }

  async getFolders(filters: MouCollectionFilters): Promise<string[]> {
    console.log(filters)
    return [] as string[]
  }

  async getAssetsCount(): Promise<number> {
    return 0
  }

  async getAssets(filters: MouCollectionFilters, page: number): Promise<MouCollectionAsset[]> {
    const filtersDuplicate = JSON.parse(JSON.stringify(filters));
    filtersDuplicate["page"] = page
    filtersDuplicate["scope"] = this.getScope()
    filtersDuplicate["pack"] = filtersDuplicate["pack"].length == 0 ? 0 : Number(filtersDuplicate["pack"])
    const assets = await MouCloudClient.apiPOST(`/assets`, filtersDuplicate)
    const results = []
    for(const data of assets) {
      results.push(new MouCollectionCloudAsset(data))
    }
    return results
  }

  async getRandomAssets(filters: MouCollectionFilters): Promise<MouCollectionAsset[]> {
    const filtersDuplicate = JSON.parse(JSON.stringify(filters));
    filtersDuplicate["scope"] = this.getScope()
    const assets = await MouCloudClient.apiPOST(`/assets/random`, filtersDuplicate)
    const results = []
    for(const data of assets) {
      results.push(new MouCollectionCloudAsset(data))
    }
    return results
  }

  getActions(asset: MouCollectionAsset): MouCollectionAction[] {
    const actions = [] as MouCollectionAction[]
    const cAsset = (asset as MouCollectionCloudAsset)
    if(cAsset.cloud_type == CloudAssetType.PREVIEW) {
      if(cAsset.type == MouCollectionAssetTypeEnum.Audio && asset.flags.hasAudioPreview) {
        actions.push({ id: CloudAssetAction.PREVIEW, name: (game as Game).i18n.localize("MOU.action_preview"), icon: "fa-solid fa-headphones" })
      }
      actions.push({ id: CloudAssetAction.MEMBERSHIP, name: (game as Game).i18n.localize("MOU.action_support"), icon: "fa-solid fa-hands-praying" })
      return actions
    }
    
    const assetType = MouCollectionAssetTypeEnum[asset.type]
    switch(cAsset.type) {
      case MouCollectionAssetTypeEnum.Scene:
      case MouCollectionAssetTypeEnum.Map:
        actions.push({ id: CloudAssetAction.IMPORT, name: (game as Game).i18n.format("MOU.action_import", { type: assetType}), icon: "fa-solid fa-file-import" })
        actions.push({ id: CloudAssetAction.CREATE_ARTICLE, name: (game as Game).i18n.localize("MOU.action_create_article"), icon: "fa-solid fa-book-open" })
        break; 
      case MouCollectionAssetTypeEnum.Item:
      case MouCollectionAssetTypeEnum.Actor:
        actions.push({ id: CloudAssetAction.DRAG, drag: true, name: (game as Game).i18n.format("MOU.action_drag", { type: assetType}), icon: "fa-solid fa-hand" })
        actions.push({ id: CloudAssetAction.IMPORT, name: (game as Game).i18n.format("MOU.action_import", { type: assetType}), icon: "fa-solid fa-file-import" })
        actions.push({ id: CloudAssetAction.CREATE_ARTICLE, name: (game as Game).i18n.localize("MOU.action_create_article"), icon: "fa-solid fa-book-open" })
        break;    
      case MouCollectionAssetTypeEnum.Image:
        actions.push({ id: CloudAssetAction.CREATE_ARTICLE, name: (game as Game).i18n.localize("MOU.action_create_article"), icon: "fa-solid fa-book-open" })
        break;    
      case MouCollectionAssetTypeEnum.PDF:
        actions.push({ id: CloudAssetAction.CREATE_ARTICLE, name: (game as Game).i18n.localize("MOU.action_create_article"), icon: "fa-solid fa-book-open" })
        break;    
      case MouCollectionAssetTypeEnum.Audio:
        actions.push({ id: CloudAssetAction.IMPORT, name: (game as Game).i18n.localize("MOU.action_audio_play"), icon: "fa-solid fa-play-pause" })
        if(asset.flags.hasAudioPreview) {
          actions.push({ id: CloudAssetAction.PREVIEW, name: (game as Game).i18n.localize("MOU.action_preview"), icon: "fa-solid fa-headphones" })
        }
        break;    
    }
    actions.push({ id: CloudAssetAction.DOWNLOAD, small: true, name: (game as Game).i18n.localize("MOU.action_download"), icon: "fa-solid fa-cloud-arrow-down" })
    actions.push({ id: CloudAssetAction.MEMBERSHIP, small: true, name: (game as Game).i18n.localize("MOU.action_support"), icon: "fa-solid fa-hands-praying" })
    
    return actions
  }

  getActionHint(asset: MouCollectionAsset, actionId: number) : MouCollectionActionHint | null {
    const action = this.getActions(asset).find(a => a.id == actionId)
    if(!action) return null
    switch(actionId) {
      case CloudAssetAction.DRAG:
        switch(asset.type) {
          case MouCollectionAssetTypeEnum.Item: return { name: action.name, description: (game as Game).i18n.localize("MOU.action_hint_drag_item") }
          case MouCollectionAssetTypeEnum.Actor: return { name: action.name, description: (game as Game).i18n.localize("MOU.action_hint_drag_actor") }
        }
        break
      case CloudAssetAction.IMPORT:
        switch(asset.type) {
          case MouCollectionAssetTypeEnum.Map: return { name: action.name, description: (game as Game).i18n.localize("MOU.action_hint_download_import_image") }
          case MouCollectionAssetTypeEnum.Scene: return { name: action.name, description: (game as Game).i18n.localize("MOU.action_hint_download_import_scene") }
          case MouCollectionAssetTypeEnum.Item: return { name: action.name, description: (game as Game).i18n.localize("MOU.action_hint_download_import_asset") }
          case MouCollectionAssetTypeEnum.Actor: return { name: action.name, description: (game as Game).i18n.localize("MOU.action_hint_download_import_asset") }
          case MouCollectionAssetTypeEnum.Image: return { name: action.name, description: (game as Game).i18n.localize("MOU.action_hint_download_import_image") }
          case MouCollectionAssetTypeEnum.Audio: return { name: action.name, description: (game as Game).i18n.localize("MOU.action_hint_download_import_audio") }
        }
        break
      case CloudAssetAction.DOWNLOAD:
        switch(asset.type) {
          case MouCollectionAssetTypeEnum.Scene: return { name: action.name, description: (game as Game).i18n.localize("MOU.action_hint_download_scene") }
          default: return { name: action.name, description: (game as Game).i18n.localize("MOU.action_hint_download_asset") }
        }
      case CloudAssetAction.CREATE_ARTICLE:
        switch(asset.type) {
          case MouCollectionAssetTypeEnum.Scene: return { name: action.name, description: (game as Game).i18n.localize("MOU.action_hint_download_create_article_scene") }
          default: return { name: action.name, description: (game as Game).i18n.localize("MOU.action_hint_download_create_article_asset") }
        }
      case CloudAssetAction.MEMBERSHIP:
        if((asset as MouCollectionCloudAsset).cloud_type == CloudAssetType.PREVIEW) { 
          return { name: action.name, description: (game as Game).i18n.localize("MOU.action_hint_subscribe_creator") }
        } else {
          return { name: action.name, description: (game as Game).i18n.localize("MOU.action_hint_visit_creator") }
        }

      case CloudAssetAction.PREVIEW:
        switch(asset.type) {
          case MouCollectionAssetTypeEnum.Audio: return { name: action.name, description: (game as Game).i18n.localize("MOU.action_hint_preview_audio") }
        }
        break
    }
    return null
  }

  /**
   * Downloads (and upload) specified asset
   * Returns :
   *  * false if something went wrong. (when not throwing an exception)
   *  * UploadResult (with path) for a single file
   *  * AnyDict (JSON) for entities
   */
  private static async downloadAsset(asset: any): Promise<FilePicker.UploadResult | false> {
    if(!asset.base_url.startsWith(MouCloudClient.AZURE_BASEURL)) {
      throw new Error("Invalid BaseURL?")
    }
    const folderPath = asset.base_url.substring(MouCloudClient.AZURE_BASEURL.length)
    const targetPath = `${MouConfig.MOU_DEF_FOLDER}/cloud/${folderPath}`

    // FVTT entity
    if(asset.filepath.endsWith(".json")) {
      if(await MouFileManager.downloadAllFiles(asset.deps, asset.base_url, targetPath)) {
        const entityString = await MouFileManager.downloadFileAsString(`${asset.base_url}/${asset.file_url}`)
        if(entityString.length > 0) {
          // replace all #DEPS#
          return {
            path: targetPath,
            message: entityString.replace(new RegExp("#DEP#", "g"), targetPath + "/"),
            status: "success",
          }
        }
        return false
      } else {
        return false
      }
    }
    // single file 
    else {
      return MouFileManager.downloadFile(asset.file_url, asset.base_url, targetPath)
    }
  }


  async executeAction(actionId: number, selAsset: MouCollectionAsset): Promise<void> {
    const asset = await MouCloudClient.apiGET(`/asset/${selAsset.id}`, { session: MouApplication.getSettings(SETTINGS_SESSION_ID) })
    const folderPath = `Moulinette/${asset.creator}/${asset.pack}`
    switch(actionId) {
      case CloudAssetAction.DRAG:
        ui.notifications?.info((game as Game).i18n.localize("MOU.dragdrop_instructions"))
        break
      case CloudAssetAction.IMPORT:
        const resultImport = await MouCollectionCloud.downloadAsset(asset)
        if(resultImport) {
          switch(asset.type) {
            case MouCollectionAssetTypeEnum.Map: MouFoundryUtils.importSceneFromMap(resultImport.path, folderPath); break
            case MouCollectionAssetTypeEnum.Scene: MouFoundryUtils.importScene(JSON.parse(resultImport.message), folderPath); break
            case MouCollectionAssetTypeEnum.Item: MouFoundryUtils.importItem(JSON.parse(resultImport.message), folderPath); break
            case MouCollectionAssetTypeEnum.Actor: MouFoundryUtils.importActor(JSON.parse(resultImport.message), folderPath); break
            case MouCollectionAssetTypeEnum.Audio: MouFoundryUtils.playStopSound(resultImport.path, MouCollectionCloud.PLAYLIST_NAME); break
          }
        }
        break
      case CloudAssetAction.CREATE_ARTICLE:
        const resultArticle = await MouCollectionCloud.downloadAsset(asset)
        if(resultArticle) {
          switch(asset.type) {
            case MouCollectionAssetTypeEnum.Scene: 
            case MouCollectionAssetTypeEnum.Item: 
            case MouCollectionAssetTypeEnum.Actor: 
              MouFoundryUtils.createJournalImageFromEntity(JSON.parse(resultArticle.message), folderPath); 
              break
            case MouCollectionAssetTypeEnum.PDF: 
              MouFoundryUtils.createJournalPDF(resultArticle.path, folderPath); 
              break
            case MouCollectionAssetTypeEnum.Map: 
            case MouCollectionAssetTypeEnum.Image: 
              MouFoundryUtils.createJournalImageOrVideo(resultArticle.path, folderPath);
              break
          }
        }
        break
        
      case CloudAssetAction.DOWNLOAD:
        const resultDownload = await MouCollectionCloud.downloadAsset(asset)
        if(resultDownload) {
          let textToCopy = resultDownload.path
          switch(asset.type) {
            case MouCollectionAssetTypeEnum.Scene: 
            case MouCollectionAssetTypeEnum.Actor: 
            case MouCollectionAssetTypeEnum.Item: 
              const path = MouFoundryUtils.getImagePathFromEntity(JSON.parse(resultDownload.message))
              if(path) {
                textToCopy = path
              }
              else {
                MouApplication.logWarn(this.APP_NAME, `Not able to retrieve image path from asset ${asset.filepath}!`)
              }
          }
          MouMediaUtils.copyToClipboard(textToCopy)
          break
        }
        break

      case CloudAssetAction.PREVIEW:
        switch(asset.type) {
          case MouCollectionAssetTypeEnum.Audio:
            const audio_url = selAsset.previewUrl
            // assuming there is an audio preview and there is a audio#audiopreview element on the page
            const audio = $("#audiopreview")[0] as HTMLAudioElement
            if(MouMediaUtils.getCleanURI(audio.src) != MouMediaUtils.getCleanURI(audio_url)) {
              audio.pause()
              audio.src = audio_url
            }
            if (audio.paused) {
              audio.src = audio_url
              audio.play();
            } else {
              audio.pause();
            }
            break
        }
        break
      
      case CloudAssetAction.MEMBERSHIP:
        const cAsset = (asset as MouCollectionCloudAsset)
        if(cAsset.cloud_type == CloudAssetType.PREVIEW) {
        } else {
          var win = window.open(cAsset.creatorUrl, '_blank');
          if (win) { 
            win.focus();
          }
        }
    }
  }

  /**
   * Fills data (from DropData) with JSON data from asset
   */
  async fromDropData(assetId: string, data: MouCollectionDragData): Promise<void> {
    const asset = await MouCloudClient.apiGET(`/asset/${assetId}`, { session: MouApplication.getSettings(SETTINGS_SESSION_ID) })    
    if(asset) {
      MouApplication.logDebug(this.APP_NAME, `fromDropData for asset ${assetId}`, data)
      switch(asset.type) {
        case MouCollectionAssetTypeEnum.Macro: 
        case MouCollectionAssetTypeEnum.Actor: 
        case MouCollectionAssetTypeEnum.Item: 
          const result = await MouCollectionCloud.downloadAsset(asset)  
          if(result) {
            data.data = JSON.parse(result.message)
          }
          break
      }
    }
  }

  async dropDataCanvas(canvas: Canvas, data: AnyDict): Promise<void> {
    console.log(canvas, data)
    throw new Error("Method not implemented.");
  }

  /** Collection Cloud has specific configurations */
  isConfigurable(): boolean {
    return true
  }

  /** Opens Configuration UI */
  configure(callback: Function): void {
    const parent = this
    new CloudCollectionConfig(function() {
      parent.refreshSettings()
      callback()
    }).render(true)
  }  

  
}
