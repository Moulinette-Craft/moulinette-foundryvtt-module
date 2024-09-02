import MouApplication from "../apps/application";
import MouCloudClient from "../clients/moulinette-cloud";
import MouDownloadManager from "../utils/download-manager";
import MouMediaUtils from "../utils/media-utils";

import { MouCollection, MouCollectionAction, MouCollectionAsset, MouCollectionAssetMeta, MouCollectionAssetType, MouCollectionAssetTypeEnum, MouCollectionCreator, MouCollectionFilters, MouCollectionPack } from "../apps/collection";
import { MOU_STORAGE_PUB, SETTINGS_SESSION_ID } from "../constants";
import { AnyDict } from "../types";
import MouFoundryUtils from "../utils/foundry-utils";

export enum CloudMode {
  ALL,                      // all assets including non-accessible
  ALL_ACCESSIBLE,           // all assets the user can access
  ONLY_SUPPORTED_CREATORS   // only assets from creators the user actively supports
}

enum CloudAssetType {
  PREVIEW,                  // asset a preview (no access, requires membership)
  FREE,                     // asset is a freebe from creator
  AVAILABLE,                // asset is available (but not free)
}

enum CloudAssetAction {
  DOWNLOAD,                 // download asset and copy path to clipboard
  IMPORT,                   // import asset (scenes/...)
  CREATE_ARTICLE,           // create article from asset
  MEMBERSHIP                // creator support page
}

class MouCollectionCloudAsset implements MouCollectionAsset {
  
  id: string;
  type: number;
  format: string;
  image: string;
  background_color: string;
  creator: string;
  pack: string;
  pack_id: string;
  name: string;
  meta: MouCollectionAssetMeta[];
  icons?: {descr: string, icon: string}[];

  // specific to MouCollectionCloud
  cloud_type: number; 
  
  constructor(data: AnyDict) {
    this.id = data._id;
    this.format = [MouCollectionAssetTypeEnum.Scene, MouCollectionAssetTypeEnum.Map].includes(data.type) ? "large" : "small"
    const basePath = MouMediaUtils.getBasePath(data.filepath)
    this.image = `${MOU_STORAGE_PUB}${data.pack.creator_ref}/${data.pack.path}/${basePath}.webp`
    this.background_color = [MouCollectionAssetTypeEnum.Scene, MouCollectionAssetTypeEnum.Map].includes(data.type) ? data.main_color : null
    this.creator = data.pack.creator
    this.pack = data.pack.name
    this.pack_id = data.pack_ref
    this.name = MouMediaUtils.prettyMediaName(data.filepath)
    this.type = data.type;
    this.meta = []
    this.icons = []

    if(data.perms == 0) {
      this.icons.push({descr: (game as Game).i18n.localize("MOU.pack_is_free"), icon: "fa-solid fa-gift"})
      this.cloud_type = CloudAssetType.FREE
    } else if (data.perms < 0) {
      this.cloud_type = CloudAssetType.PREVIEW
    } else {
      this.cloud_type = CloudAssetType.AVAILABLE
    }
    
    switch(data.type) {
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
      case MouCollectionAssetTypeEnum.Map:
      case MouCollectionAssetTypeEnum.Image:
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
      text: MouMediaUtils.prettyFilesize(data.filesize),
      hint: (game as Game).i18n.localize("MOU.meta_filesize")})
  }
}

export default class MouCollectionCloud implements MouCollection {

  private mode: CloudMode

  constructor(mode: CloudMode) {
    this.mode = mode
  }

  getId() : string {
    switch(this.mode) {
      case CloudMode.ALL : return "cloud-all"
      case CloudMode.ALL_ACCESSIBLE : return "cloud-accessible"
      case CloudMode.ONLY_SUPPORTED_CREATORS: return "cloud-supported"
    }
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
      mode: this.getId()
    }
  }

  async getTypes(filters: MouCollectionFilters): Promise<MouCollectionAssetType[]> {
    const filtersDuplicate = JSON.parse(JSON.stringify(filters));
    filtersDuplicate["scope"] = this.getScope()
    return MouCloudClient.apiPOST("/assets/types", filtersDuplicate)
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
    const packs = await MouCloudClient.apiPOST("/packs", { type: type, creator: creator, scope: this.getScope() })
    const results = []
    for(const p of packs) {
      const pack : MouCollectionPack = {
        id: p.pack_ref,
        name: p.name,
        assetsCount: p.assets
      }  
      results.push(pack)
    }
    return results
  }

  async getAssets(filters: MouCollectionFilters, page: number): Promise<MouCollectionAsset[]> {
    const filtersDuplicate = JSON.parse(JSON.stringify(filters));
    filtersDuplicate["page"] = page
    filtersDuplicate["scope"] = this.getScope()
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
      actions.push({ id: CloudAssetAction.MEMBERSHIP, name: (game as Game).i18n.localize("MOU.action_support"), icon: "fa-solid fa-hands-praying" })
      return actions
    }
    
    const assetName = MouCollectionAssetTypeEnum[asset.type]
    switch(cAsset.type) {
      case MouCollectionAssetTypeEnum.Scene:
      case MouCollectionAssetTypeEnum.Map:
        actions.push({ id: CloudAssetAction.IMPORT, name: (game as Game).i18n.format("MOU.action_import", { type: assetName}), icon: "fa-solid fa-file-import" })
        actions.push({ id: CloudAssetAction.CREATE_ARTICLE, name: (game as Game).i18n.localize("MOU.action_create_article"), icon: "fa-solid fa-book-open" })
        break;    
    }
    actions.push({ id: CloudAssetAction.DOWNLOAD, name: (game as Game).i18n.localize("MOU.action_download"), icon: "fa-solid fa-cloud-arrow-down" })
    
    return actions
  }

  /**
   * Downloads (and upload) specified asset
   * Returns :
   *  * false if something went wrong. (when not throwing an exception)
   *  * UploadResult (with path) for a single file
   *  * AnyDict (JSON) for entities
   */
  private static async downloadAsset(asset: any): Promise<FilePicker.UploadResult | false> {
    const assetType = MouCollectionAssetTypeEnum[asset.type]
    if(!asset.base_url.startsWith(MouCloudClient.AZURE_BASEURL)) {
      throw new Error("Invalid BaseURL?")
    }
    const folderPath = asset.base_url.substring(MouCloudClient.AZURE_BASEURL.length)
    const targetPath = `moulinette-v2/${assetType.toLowerCase()}s/${folderPath}`

    // FVTT entity
    if(asset.filepath.endsWith(".json")) {
      if(await MouDownloadManager.downloadAllFiles(asset.deps, asset.base_url, targetPath)) {
        const entityString = await MouDownloadManager.downloadFileAsString(`${asset.base_url}/${asset.file_url}`)
        if(entityString.length > 0) {
          // replace all #DEPS#
          return {
            path: targetPath,
            message: entityString.replace(new RegExp("#DEP#", "g"), targetPath + "/"),
            status: "success"
          }
        }
        return false
      } else {
        return false
      }
    }
    // single file 
    else {
      return MouDownloadManager.downloadFile(asset.file_url, asset.base_url, targetPath)
    }
  }


  async executeAction(actionId: number, assetId: string): Promise<void> {
    const asset = await MouCloudClient.apiGET(`/asset/${assetId}`, { session: MouApplication.getSettings(SETTINGS_SESSION_ID) })
    const folderPath = `Moulinette/${asset.creator}/${asset.pack}`
    switch(actionId) {
      case CloudAssetAction.IMPORT:
        const resultImport = await MouCollectionCloud.downloadAsset(asset)
        if(resultImport) {
          switch(asset.type) {
            case MouCollectionAssetTypeEnum.Map: MouFoundryUtils.createSceneFromMap(resultImport.path, folderPath); break
            case MouCollectionAssetTypeEnum.Scene: MouFoundryUtils.createScene(JSON.parse(resultImport.message), folderPath); break
            //case MouCollectionAssetTypeEnum.Map:
            //  MouFoundryUtils.createJournalImage(uploadResult.path, folderPath)
            //  break
          }
        }
        break
      case CloudAssetAction.DOWNLOAD:
        const resultDownload = await MouCollectionCloud.downloadAsset(asset)
        if(resultDownload) {
          let textToCopy = resultDownload.path
          navigator.clipboard.writeText(textToCopy).then(() => {
            ui.notifications?.info((game as Game).i18n.localize("MOU.clipboard_copy_success"))
          })
          .catch(() => {
            ui.notifications?.warn((game as Game).i18n.localize("MOU.clipboard_copy_failed"))
          });
          break
        }
        
    }
  }
}
