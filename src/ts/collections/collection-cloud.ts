import MouApplication from "../apps/application";
import { MouCollection, MouCollectionAction, MouCollectionAsset, MouCollectionAssetType, MouCollectionAssetTypeEnum, MouCollectionCreator, MouCollectionFilters, MouCollectionPack } from "../apps/collection";
import MouCloudClient from "../clients/moulinette-cloud";
import { MOU_STORAGE_PUB, SETTINGS_SESSION_ID } from "../constants";
import { AnyDict } from "../types";
import MouMediaUtils from "../utils/media-utils";

export enum CloudMode {
  ALL,                      // all assets including non-accessible
  ALL_ACCESSIBLE,           // all assets the user can access
  ONLY_SUPPORTED_CREATORS   // only assets from creators the user actively supports
}

class MouCollectionCloudAsset implements MouCollectionAsset {
  
  id: string;
  type: number;
  format: string;
  image: string;
  background_color: string;
  creator: string;
  pack: string;
  name: string;
  meta: string[];
  icons?: {descr: string, icon: string}[];
  
  constructor(data: AnyDict) {
    this.id = data._id;
    this.format = [MouCollectionAssetTypeEnum.Scene, MouCollectionAssetTypeEnum.Map].includes(data.type) ? "large" : "small"
    const basePath = MouMediaUtils.getBasePath(data.filepath)
    this.image = `${MOU_STORAGE_PUB}${data.pack.creator_ref}/${data.pack.path}/${basePath}.webp`
    this.background_color = [MouCollectionAssetTypeEnum.Scene, MouCollectionAssetTypeEnum.Map].includes(data.type) ? data.main_color : null
    this.creator = data.pack.creator
    this.pack = data.pack.name
    this.name = MouMediaUtils.prettyMediaNames(data.filepath)
    this.type = data.type;
    this.meta = []

    switch(data.type) {
      case MouCollectionAssetTypeEnum.Scene:
        this.meta = [`${data.scene.width} x ${data.scene.height}`]
        this.icons = []
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

  getActions(type: Number): MouCollectionAction[] {
    const actions = [] as MouCollectionAction[]
    switch(type) {
      case MouCollectionAssetTypeEnum.Scene:
      default:
        actions.push({
          id: "download",
          name: "Download"
        })
    }
    return actions
  }

  executeAction(actionId: string, assetId: string): Promise<void> {
    console.log(actionId, assetId)
    throw new Error("Method not implemented.");
  }
}
