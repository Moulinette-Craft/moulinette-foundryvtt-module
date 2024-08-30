import { MouCollection, MouCollectionAsset, MouCollectionAssetType, MouCollectionAssetTypeEnum, MouCollectionCreator, MouCollectionFilters, MouCollectionPack } from "../apps/collection";
import MouCloudClient from "../clients/moulinette-cloud";
import { MOU_STORAGE_PUB } from "../constants";
import { AnyDict } from "../types";
import MouMediaUtils from "../utils/media-utils";

export enum CloudMode {
  ALL,                      // all assets including non-accessible
  ALL_ACCESSIBLE,           // all assets the user can access
  ONLY_SUPPORTED_CREATORS   // only assets from creators the user actively supports
}

class MouCollectionCloudAsset implements MouCollectionAsset {
  
  id: string;
  format: string;
  image: string;
  background_color: string;
  creator: string;
  pack: string;
  name: string;
  meta: string[];
  
  constructor(data: AnyDict) {
    this.id = data._id;
    this.format = [MouCollectionAssetTypeEnum.Scene, MouCollectionAssetTypeEnum.Map].includes(data.type) ? "large" : "small"
    const basePath = MouMediaUtils.getBasePath(data.filepath)
    this.image = `${MOU_STORAGE_PUB}${data.pack.creator_ref}/${data.pack.path}/${basePath}.webp`
    this.background_color = [MouCollectionAssetTypeEnum.Scene, MouCollectionAssetTypeEnum.Map].includes(data.type) ? data.main_color : null
    this.creator = data.pack.creator
    this.pack = data.pack.name
    this.name = MouMediaUtils.prettyMediaNames(data.filepath)
    this.meta = []

    switch(data.type) {
      case MouCollectionAssetTypeEnum.Scene:
        this.meta = [`${data.scene.width} x ${data.scene.height}`]
        break
      case MouCollectionAssetTypeEnum.Map:
      case MouCollectionAssetTypeEnum.Image:
        this.meta = [`${data.size.width} x ${data.size.height}`]
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
      case CloudMode.ALL_ACCESSIBLE : return (game as Game).i18n.localize("MOU.collection_cloud_type_owned");
      case CloudMode.ONLY_SUPPORTED_CREATORS: return (game as Game).i18n.localize("MOU.collection_type_supported");
    }
  }

  async getTypes(filters: MouCollectionFilters): Promise<MouCollectionAssetType[]> {
    return MouCloudClient.apiPOST("/assets/types", filters)
  }

  async getCreators(type: MouCollectionAssetTypeEnum): Promise<MouCollectionCreator[]> {
    const creators = await MouCloudClient.apiPOST("/creators", { type: type })
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
    const packs = await MouCloudClient.apiPOST("/packs", { type: type, creator: creator })
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
    const assets = await MouCloudClient.apiPOST(`/assets`, filtersDuplicate)
    const results = []
    for(const data of assets) {
      results.push(new MouCollectionCloudAsset(data))
    }
    return results
  }

  async getRandomAssets(filters: MouCollectionFilters): Promise<MouCollectionAsset[]> {
    const assets = await MouCloudClient.apiPOST(`/assets/random`, filters)
    const results = []
    for(const data of assets) {
      results.push(new MouCollectionCloudAsset(data))
    }
    return results
  }
}
