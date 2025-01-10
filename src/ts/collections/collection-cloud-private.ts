import MouApplication from "../apps/application";
import MouCloudClient from "../clients/moulinette-cloud";
import MouFileManager from "../utils/file-manager";
import MouMediaUtils from "../utils/media-utils";

import { MouCollection, MouCollectionAction, MouCollectionActionHint, MouCollectionAsset, MouCollectionAssetMeta, MouCollectionAssetType, MouCollectionAssetTypeEnum, MouCollectionCreator, MouCollectionFilters, MouCollectionPack, MouCollectionSearchResults } from "../apps/collection";
import MouConfig, { SETTINGS_SESSION_ID } from "../constants";
import { AnyDict } from "../types";
import MouFoundryUtils from "../utils/foundry-utils";
import MouPreview from "../apps/preview";
import MouBrowser from "../apps/browser";


enum CloudAssetAction {
  DRAG,                     // drag & drop capability for the asset
  DOWNLOAD,                 // download asset and copy path to clipboard
  IMPORT,                   // import asset (scenes/...)
  CREATE_ARTICLE,           // create article from asset
  MEMBERSHIP,               // creator support page,
  PREVIEW,                  // preview audio
}

class MouCollectionCloudPrivateAsset implements MouCollectionAsset {
  
  id: string;
  url: string;
  baseUrl: string;
  type: number;
  format: string;
  previewUrl: string;
  creator: string;
  creatorUrl: string | null;
  pack: string;
  pack_id: string;
  name: string;
  meta: MouCollectionAssetMeta[];
  icon: string | null;
  icons?: {descr: string, icon: string}[];
  draggable?: boolean;
  flags: AnyDict;

  // specific to CloudPrivate
  deps?: string[];
  sas: string;
  
  constructor(idx: number, asset: AnyDict, creator: AnyDict, pack: AnyDict) {
    this.id = idx.toString()
    this.baseUrl = pack.path
    this.sas = pack.sas
    if (typeof asset == 'string') {
      const assetPath = asset as string
      this.url = assetPath
      this.draggable = true
      const ext = assetPath.split(".").pop() || ""  
      if(MouConfig.MEDIA_AUDIO.includes(ext)) {
        this.type = MouCollectionAssetTypeEnum.Audio
      } else if(MouConfig.MEDIA_IMAGES.includes(ext)) {
        this.type = MouCollectionAssetTypeEnum.Image
      } else if(MouConfig.MEDIA_VIDEOS.includes(ext)) {
        this.type = MouCollectionAssetTypeEnum.Image
      } else {
        console.log("ERROR", ext)
        this.type = MouCollectionAssetTypeEnum.Undefined
      }  
      this.previewUrl = `${pack.path}/${MouMediaUtils.getBasePath(assetPath) + "_thumb.webp"}?${pack.sas}`
      this.name = MouMediaUtils.prettyMediaName(asset)
    }
    else {
      this.url = asset.path
      this.deps = asset.deps
      this.previewUrl = `${pack.path}/${MouMediaUtils.getBasePath(asset.img) + "_thumb.webp"}?${pack.sas}`
      this.name = MouMediaUtils.prettyMediaName((asset.name as string))
      if(asset.type == "scene") this.type = MouCollectionAssetTypeEnum.Scene
      else {
        this.type = MouCollectionAssetTypeEnum.Undefined
        console.log("ERROR", asset)
      }
    }
    this.format = "small"
    
    this.creator = creator.publisher
    this.creatorUrl = null
    this.pack = pack.name
    this.pack_id = pack.id.toString()
    
    this.meta = []
    this.icon = null
    this.flags = {}
  }
}

export default class MouCollectionCloudPrivate implements MouCollection {

  APP_NAME = "MouCollectionCloudPrivate"

  private error: number;

  static PLAYLIST_NAME = "Moulinette Cloud (Private)"
  static ERROR_SERVER_CNX = 1

  constructor() {
    this.error = 0
  }
  
  async initialize(): Promise<void> {
    const module = MouApplication.getModule()
    if(!module.cache.privateAssets) {
      // retrieve private assets from Moulinette Cloud
      const params = { scope: this.getScope() }
      try {
        const results = await MouCloudClient.apiPOST("/private-assets", params)
        const assets = []
        let idx = 0
        for(const creator of results) {
          for(const pack of creator.packs) {
            for(const a of pack.assets) {
              assets.push(new MouCollectionCloudPrivateAsset(idx++, a, creator, pack))
            }
          }
        }
        module.cache.privateAssets = assets
      } catch(error: any) {
        this.error = MouCollectionCloudPrivate.ERROR_SERVER_CNX
        MouApplication.logError(this.APP_NAME, `Not able to retrieve asset types`, error)
        module.cache.privateAssets = []
      }
    }
  }
  
  getId() : string {
    return "mou-cloud-private"
  }
  
  getName(): string {
    return (game as Game).i18n.localize("MOU.collection_type_cloud_private")
  }

  private getScope() {
    return {
      session: MouApplication.getSettings(SETTINGS_SESSION_ID)
    }
  }

  private getFilterAssets(filters: MouCollectionFilters): MouCollectionCloudPrivateAsset[] {
    const module = MouApplication.getModule()
    return module.cache.privateAssets.filter((asset: MouCollectionCloudPrivateAsset) => {
      if(filters.type && asset.type != filters.type) return false
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

  getSupportedTypes(): MouCollectionAssetTypeEnum[] {
    return [MouCollectionAssetTypeEnum.Image, MouCollectionAssetTypeEnum.Audio, MouCollectionAssetTypeEnum.Scene]
  }

  async getTypes(filters: MouCollectionFilters): Promise<MouCollectionAssetType[]> {
    const filterDuplicates = foundry.utils.duplicate(filters)
    if(filterDuplicates.type) delete filterDuplicates.type
    const assets = this.getFilterAssets(filterDuplicates)
    const results = [] as MouCollectionAssetType[]    
    results.push({ id: MouCollectionAssetTypeEnum.Image, assetsCount: assets.filter((a: MouCollectionCloudPrivateAsset) => a.type == MouCollectionAssetTypeEnum.Image).length })
    results.push({ id: MouCollectionAssetTypeEnum.Audio, assetsCount: assets.filter((a: MouCollectionCloudPrivateAsset) => a.type == MouCollectionAssetTypeEnum.Audio).length })
    results.push({ id: MouCollectionAssetTypeEnum.Scene, assetsCount: assets.filter((a: MouCollectionCloudPrivateAsset) => a.type == MouCollectionAssetTypeEnum.Scene).length })
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
        assetsCount: assets.filter((a: MouCollectionCloudPrivateAsset) => a.creator == creator).length
      })
    }

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
        assetsCount: assets.filter((a: MouCollectionCloudPrivateAsset) => a.pack_id == packId).length
      })
    }

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

  getActions(asset: MouCollectionAsset): MouCollectionAction[] {
    const actions = [] as MouCollectionAction[]
    const cAsset = (asset as MouCollectionCloudPrivateAsset)
    
    const assetType = MouCollectionAssetTypeEnum[asset.type]
    switch(cAsset.type) {
      case MouCollectionAssetTypeEnum.Scene:
      case MouCollectionAssetTypeEnum.Map:
        actions.push({ id: CloudAssetAction.IMPORT, name: (game as Game).i18n.format("MOU.action_import", { type: assetType}), icon: "fa-solid fa-file-import" })
        actions.push({ id: CloudAssetAction.CREATE_ARTICLE, name: (game as Game).i18n.localize("MOU.action_create_article"), icon: "fa-solid fa-book-open" })
        actions.push({ id: CloudAssetAction.PREVIEW, small: true, name: (game as Game).i18n.localize("MOU.action_preview_asset"), icon: "fa-solid fa-eyes" })
        break; 
      case MouCollectionAssetTypeEnum.Image:
        actions.push({ id: CloudAssetAction.DRAG, drag: true, name: (game as Game).i18n.format("MOU.action_drag", { type: assetType}), icon: "fa-solid fa-hand" })
        actions.push({ id: CloudAssetAction.CREATE_ARTICLE, name: (game as Game).i18n.localize("MOU.action_create_article"), icon: "fa-solid fa-book-open" })
        actions.push({ id: CloudAssetAction.PREVIEW, small: true, name: (game as Game).i18n.localize("MOU.action_preview_asset"), icon: "fa-solid fa-eyes" })
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
    
    return actions
  }

  getActionHint(asset: MouCollectionAsset, actionId: number) : MouCollectionActionHint | null {
    const action = this.getActions(asset).find(a => a.id == actionId)
    if(!action) return null
    switch(actionId) {
      case CloudAssetAction.IMPORT:
        switch(asset.type) {
          case MouCollectionAssetTypeEnum.Audio: return { name: action.name, description: (game as Game).i18n.localize("MOU.action_hint_download_import_audio") }
          case MouCollectionAssetTypeEnum.Scene: return { name: action.name, description: (game as Game).i18n.localize("MOU.action_hint_download_import_scene") }
          
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
      
      case CloudAssetAction.PREVIEW:
        switch(asset.type) {
          case MouCollectionAssetTypeEnum.Audio: return { name: action.name, description: (game as Game).i18n.localize("MOU.action_hint_preview_audio") }
          case MouCollectionAssetTypeEnum.Scene: 
          case MouCollectionAssetTypeEnum.Image: 
          case MouCollectionAssetTypeEnum.Map: 
            return { name: action.name, description: (game as Game).i18n.localize("MOU.action_hint_preview_asset") }
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
  private static async downloadAsset(asset: MouCollectionCloudPrivateAsset): Promise<FilePicker.UploadResult | false> {
    if(!asset.baseUrl.startsWith(MouCloudClient.AZURE_BASEURL_PRIVATE)) {
      throw new Error("Invalid URL?")
    }
    const targetPath = MouApplication.getModule().cloudclient.getDefaultDownloadPrivateFolder(asset.baseUrl)

    // FVTT entity
    if(asset.type == MouCollectionAssetTypeEnum.Scene) {
      const deps = asset.deps!.map(d => `${d}?${asset.sas}`)
      await MouFileManager.downloadAllFiles(deps, asset.baseUrl, targetPath)
      const entityString = await MouFileManager.downloadFileAsString(`${asset.baseUrl}/${asset.url}?${asset.sas}`)
      if(entityString.length > 0) {
        // replace all #DEPS#
        return {
          path: targetPath,
          message: entityString.replace(new RegExp("#DEP#", "g"), targetPath + "/"),
          status: "success",
        }
      }
      return false
    }
    // single file 
    else {
      return MouFileManager.downloadFile(`${asset.url}?${asset.sas}`, asset.baseUrl, targetPath)
    }
  }


  async executeAction(actionId: number, selAsset: MouCollectionAsset): Promise<void> {
    const folderPath = `Moulinette/${selAsset.creator}/${selAsset.pack}`
    const cAsset = (selAsset as MouCollectionCloudPrivateAsset);
    switch(actionId) {
      case CloudAssetAction.DRAG:
        ui.notifications?.info((game as Game).i18n.localize("MOU.dragdrop_instructions"))
        break
      case CloudAssetAction.IMPORT:
        const resultImport = await MouCollectionCloudPrivate.downloadAsset(cAsset)
        if(resultImport) {
          switch(cAsset.type) {
            case MouCollectionAssetTypeEnum.Scene: MouFoundryUtils.importScene(JSON.parse(resultImport.message), folderPath); break
            case MouCollectionAssetTypeEnum.Audio: MouFoundryUtils.playStopSound(resultImport.path, MouCollectionCloudPrivate.PLAYLIST_NAME); break
          }
        }
        break
      case CloudAssetAction.CREATE_ARTICLE:
        const resultArticle = await MouCollectionCloudPrivate.downloadAsset(cAsset)
        if(resultArticle) {
          switch(cAsset.type) {
            case MouCollectionAssetTypeEnum.Scene: 
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
        const resultDownload = await MouCollectionCloudPrivate.downloadAsset(cAsset)
        if(resultDownload) {
          let textToCopy = resultDownload.path
          switch(cAsset.type) {
            case MouCollectionAssetTypeEnum.Scene: 
              const path = MouFoundryUtils.getImagePathFromEntity(JSON.parse(resultDownload.message))
              if(path) {
                textToCopy = path
              }
              else {
                MouApplication.logWarn(this.APP_NAME, `Not able to retrieve image path from asset ${cAsset.url}!`)
              }
          }
          MouMediaUtils.copyToClipboard(textToCopy)
          break
        }
        break

      case CloudAssetAction.PREVIEW:
        switch(cAsset.type) {
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
          case MouCollectionAssetTypeEnum.Scene:
            const jsonData = await MouFileManager.downloadFileAsString(`${cAsset.baseUrl}/${cAsset.url}?${cAsset.sas}`)
            if(jsonData.length > 0) {
              const imagePath = MouFoundryUtils.getImagePathFromEntity(JSON.parse(jsonData));
              if(imagePath) {
                const depPath = imagePath.replace("#DEP#", "")
                const dep = cAsset.deps!.find((d : string) => d.startsWith(depPath))
                if(dep) {
                  (new MouPreview(`${cAsset.baseUrl}/${dep}?${cAsset.sas}`)).render(true)  
                } else {
                  MouApplication.logError(this.APP_NAME, `Failed to find matching dependency ${depPath}`)
                }
              } else {
                MouApplication.logError(this.APP_NAME, `Failed to get image from scene ${cAsset.url.split("?")[0]}`)  
              }
            } else {
              MouApplication.logError(this.APP_NAME, `Failed to download scene data for ${cAsset.url.split("?")[0]}`)
            }
            break
          case MouCollectionAssetTypeEnum.Image:
          case MouCollectionAssetTypeEnum.Map:
            (new MouPreview(`${cAsset.baseUrl}/${cAsset.url}?${cAsset.sas}`)).render(true)
            break;
        }
        break
    }
  }

  async fromDropData(): Promise<void> {
    // do nothing
  }

  async dropDataCanvas(canvas: Canvas, data: AnyDict): Promise<void> {
    const activeLayer = canvas.layers.find((l : AnyDict) => l.active)?.name
    const position = {x: data.x, y: data.y }

    const assets = MouApplication.getModule().cache.privateAssets

    if(data.moulinette.asset >= 0 && data.moulinette.asset < assets.length) {
      const asset = assets[data.moulinette.asset] as MouCollectionCloudPrivateAsset
      const result = await MouCollectionCloudPrivate.downloadAsset(asset)  
      if(result) {
        if(data.type == "Image") {
          if(activeLayer == "NotesLayer") {
            MouFoundryUtils.createNoteImage(canvas, `Moulinette/Cloud Private Assets/Dropped`, result.path, position)
          } else {
            MouFoundryUtils.createTile(canvas, result.path, position)
          }
        } else if(data.type == "Audio") {
          MouFoundryUtils.createAmbientAudio(canvas, result.path, position)
        }
      }
    }
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
    if(this.error == MouCollectionCloudPrivate.ERROR_SERVER_CNX) {
      return (game as Game).i18n.localize("MOU.error_server_connection")
    }
    return null;
  }

  supportsType(type: MouCollectionAssetTypeEnum): boolean {
    return [
      MouCollectionAssetTypeEnum.Audio, 
      MouCollectionAssetTypeEnum.Image, 
      MouCollectionAssetTypeEnum.Scene, 
      MouCollectionAssetTypeEnum.Map].includes(type)
  }
  
  async selectAsset(asset: MouCollectionAsset): Promise<string | null> {
    const cAsset = (asset as MouCollectionCloudPrivateAsset);
    const resultDownload = await MouCollectionCloudPrivate.downloadAsset(cAsset)
    return resultDownload ? resultDownload.path : null
  }
}
