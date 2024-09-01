import MouApplication from "../apps/application";
import MouCloudClient from "../clients/moulinette-cloud";
import MouDownloadManager from "../utils/download-manager";
import MouMediaUtils from "../utils/media-utils";

import { MouCollection, MouCollectionAction, MouCollectionAsset, MouCollectionAssetType, MouCollectionAssetTypeEnum, MouCollectionCreator, MouCollectionFilters, MouCollectionPack } from "../apps/collection";
import { MOU_STORAGE_PUB, SETTINGS_SESSION_ID } from "../constants";
import { AnyDict } from "../types";

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
  meta: string[];
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
    this.name = MouMediaUtils.prettyMediaNames(data.filepath)
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
        this.meta = [`${data.scene.width} x ${data.scene.height}`]
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
        this.meta = [`${MouMediaUtils.prettyNumber(data.size.width, true)} x ${MouMediaUtils.prettyNumber(data.size.height, true)}`]
        break
      case MouCollectionAssetTypeEnum.PDF:
        this.meta = [`${data.pdf.pages} ` + (game as Game).i18n.localize(data.pdf.pages > 1 ? "MOU.pages" : "MOU.page")]
        break
    }
    this.meta.push(MouMediaUtils.prettyFilesize(data.filesize))
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
    
    switch(cAsset.type) {
      case MouCollectionAssetTypeEnum.Scene:
      case MouCollectionAssetTypeEnum.Map:
        actions.push({ id: CloudAssetAction.IMPORT, name: (game as Game).i18n.localize("MOU.action_import"), icon: "fa-solid fa-file-import" })
        break;    
    }
    actions.push({ id: CloudAssetAction.DOWNLOAD, name: (game as Game).i18n.localize("MOU.action_download"), icon: "fa-solid fa-cloud-arrow-down" })
    
    return actions
  }

  async executeAction(actionId: number, assetId: string): Promise<void> {
    switch(actionId) {
      case CloudAssetAction.DOWNLOAD:
        const asset = await MouCloudClient.apiGET(`/asset/${assetId}`, { session: MouApplication.getSettings(SETTINGS_SESSION_ID) })
        const assetType = MouCollectionAssetTypeEnum[asset.type]
        if(!asset.base_url.startsWith(MouCloudClient.AZURE_BASEURL)) {
          throw new Error("Invalid BaseURL?")
        }
        const folderPath = asset.base_url.substring(MouCloudClient.AZURE_BASEURL.length)
        const fileUrl = `${asset.base_url}/${asset.file_url}`
        MouDownloadManager.downloadFile(fileUrl, `moulinette-v2/${assetType.toLowerCase()}s/${folderPath}`)
        break
    }
  }
}
