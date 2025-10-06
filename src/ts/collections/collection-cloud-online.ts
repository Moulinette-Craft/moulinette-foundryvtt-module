import MouApplication from "../apps/application";
import MouCloudClient from "../clients/moulinette-cloud";

import { MouCollection, MouCollectionAsset, MouCollectionAssetType, MouCollectionCreator, MouCollectionFilters, MouCollectionPack, MouCollectionSearchResults } from "../apps/collection";
import { SETTINGS_SESSION_ID } from "../constants";
import { AnyDict } from "../types";
import MouCollectionCloudBase, { CloudMode, MouCollectionCloudAsset } from "./collection-cloud-base";


interface MouCollectionCloudCache {
  currentSearchTerms?: string,
  curScope?: CloudMode,
  curType?: number,
  curTypes?: MouCollectionAssetType[],
  curCreators?: MouCollectionCreator[],
  curPacks?: MouCollectionPack[],
  curFolders?: string[]
}

export default class MouCollectionCloudOnline extends MouCollectionCloudBase implements MouCollection {

  override APP_NAME = "MouCollectionCloud"

  static ERROR_SERVER_CNX = 1

  private error: number

  private cache: MouCollectionCloudCache

  constructor() {
    super()
    this.mode = CloudMode.ALL
    this.error = 0
    this.cache = {}
  }
  
  async initialize(): Promise<void> {
    // nothing to do
  }

  getId() : string {
    return "mou-cloud"
  }
  
  getName(): string {
    return (game as Game).i18n.localize("MOU.collection_type_cloud_all");
  }

  getDescription(): string {
    return (game as Game).i18n.localize("MOU.collection_type_cloud_desc");
  }

  async getTypes(filters: MouCollectionFilters): Promise<MouCollectionAssetType[]> {
    const filtersDuplicate = JSON.parse(JSON.stringify(filters));
    filtersDuplicate["scope"] = this.getScope()
    // returns a dict with key = asset type and value = count
    try {
      const results = await MouCloudClient.apiPOST("/assets/types", filtersDuplicate)
      return Object.entries(results).map( entry => { return {
            id: Number(entry[0]),
            assetsCount: entry[1]
          } as MouCollectionAssetType
        })
    } catch(error: any) {
      this.error = MouCollectionCloudOnline.ERROR_SERVER_CNX
      MouApplication.logError(this.APP_NAME, `Not able to retrieve asset types`, error)
      return []
    }
  }

  async getCreators(filters: MouCollectionFilters): Promise<MouCollectionCreator[]> {
    const filtersDuplicate = JSON.parse(JSON.stringify(filters));
    filtersDuplicate["scope"] = this.getScope()
    try {
      const creators = await MouCloudClient.apiPOST("/creators", filtersDuplicate)
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
    } catch(error: any) {
      this.error = MouCollectionCloudOnline.ERROR_SERVER_CNX
      MouApplication.logError(this.APP_NAME, `Not able to retrieve creators`, error)
      return []
    }
  }
  
  async getPacks(filters: MouCollectionFilters): Promise<MouCollectionPack[]> {
    const filtersDuplicate = JSON.parse(JSON.stringify(filters));
    filtersDuplicate["scope"] = this.getScope()
    if(!filters.creator || filters.creator.length == 0) return [];
    try {
      const packs = await MouCloudClient.apiPOST("/packs", filtersDuplicate)
      
      const results: { [key: string]: MouCollectionPack } = {};
      for(const p of packs) {
        if(p.name in results) {
          const existing = results[p.name]
          existing.assetsCount += p.assets
          existing.id += `;${p.pack_ref}`
        } else {
          results[p.name] = {
            id: `${p.pack_ref}`,
            name: p.name,
            assetsCount: p.assets
          }
        }
      }
      return Object.values(results)
    } catch(error: any) {
      this.error = MouCollectionCloudOnline.ERROR_SERVER_CNX
      MouApplication.logError(this.APP_NAME, `Not able to retrieve packs`, error)
      return []
    }
  }

  async getFolders(filters: MouCollectionFilters): Promise<string[]> {
    if(filters.creator && filters.creator.length > 0 && this.cache.curFolders) {
      return this.cache.curFolders
    }
    return [] as string[]
  }

  async getAssetsCount(): Promise<number> {
    return 0
  }

  async getAssets(filters: MouCollectionFilters, page: number): Promise<MouCollectionAsset[]> {
    const filtersDuplicate = foundry.utils.duplicate(filters) as AnyDict;
    filtersDuplicate["page"] = page
    filtersDuplicate["scope"] = this.getScope()
    filtersDuplicate["pack"] = filtersDuplicate["pack"].length == 0 ? null : filtersDuplicate["pack"]
    
    try {
      this.error = 0;
      const assets = await MouCloudClient.apiPOST(`/assets`, filtersDuplicate)
      const results = []
      for(const data of assets) {
        results.push(new MouCollectionCloudAsset(data))
      }
      return results
    } catch(error: any) {
      this.error = MouCollectionCloudOnline.ERROR_SERVER_CNX
      MouApplication.logError(this.APP_NAME, `Not able to retrieve assets`, error)
      return []
    }
  }

  /**
   * Search assets based on filters
   * 
   * Caching optimizing the results
   * * If the search terms or the scope changed   => type + packs facets (ie full search)
   * * If the type changed                        => pack facet only
   * * If only the page changed                   => no facet at all (ie only results)
   */
  async searchAssets(filters: MouCollectionFilters, page: number): Promise<MouCollectionSearchResults> {
    const filtersDuplicate = foundry.utils.duplicate(filters) as AnyDict;
    filtersDuplicate["page"] = page
    filtersDuplicate["scope"] = this.getScope()
    filtersDuplicate["pack"] = filtersDuplicate["pack"].length == 0 ? null : filtersDuplicate["pack"]
    filtersDuplicate["facets"] = { types: false, packs: false, folders: false }

    // enable/disable facets based on cache
    if((this.cache.curScope == undefined || this.cache.curScope != this.mode) || (!this.cache.currentSearchTerms == undefined || this.cache.currentSearchTerms != filters.searchTerms)) {
      filtersDuplicate["facets"]["types"] = true
      filtersDuplicate["facets"]["creators"] = true
      filtersDuplicate["facets"]["packs"] = true
      // reset folders if search terms changed
      this.cache.curFolders = undefined
      filters.folder = undefined

    }
    else if(!this.cache.curType == undefined || this.cache.curType != filters.type) {
      filtersDuplicate["facets"]["types"] = true
      filtersDuplicate["facets"]["creators"] = true
      filtersDuplicate["facets"]["packs"] = true
    }
    else if(!this.cache.curCreators == undefined || this.cache.curCreators != filters.creator) {
      filtersDuplicate["facets"]["packs"] = true
    }
    // retrieve folders if creator and pack are selected
    if(filters.creator && filters.creator.length > 0 && page == 0) {
      // request folders only if filter not specified or if list not yet known
      if(!this.cache.curFolders || !filters.folder) {
        filtersDuplicate["facets"]["folders"] = true
      }
    }

    this.cache.currentSearchTerms = filters.searchTerms
    this.cache.curScope = this.mode
    this.cache.curType = filters.type

    try {
      this.error = 0;
      //console.log(filtersDuplicate)
      const results = await MouCloudClient.apiPOST(`/search`, filtersDuplicate)
      //console.log(results)
      
      // process types facets
      if("types" in results) {
        results["types"] = results["types"].map( (entry:AnyDict) => { return {
            id: Number(entry._id),
            assetsCount: entry.total_assets
          } as MouCollectionAssetType
        })
        this.cache.curTypes = results["types"]
      } else {
        results["types"] =  foundry.utils.duplicate(this.cache.curTypes)
      }

      // process creators facets
      if("creators" in results) {
        // process creators
        results["creators"] = results["creators"].map( (entry:AnyDict) => { return {
            id: entry.name,
            name: entry.name,
            assetsCount: entry.total_assets
          } as MouCollectionCreator
        })
        this.cache.curCreators = results["creators"]
      } 
      else {
        results["creators"] = foundry.utils.duplicate(this.cache.curCreators)
      }

      // process packs facets
      if("packs" in results) {
        const packs: { [key: string]: MouCollectionPack } = {};
        // clean up pack names (removing 4K and HD from name)
        for(const p of results["packs"]) {
          if(p.name.toUpperCase().endsWith(" 4K") || p.name.toUpperCase().endsWith(" HD")) {
            p.name = p.name.substring(0, p.name.length - 3).trim()
          }
        }
        for(const p of results["packs"]) {
          if(p.name in packs) {
            const existing = packs[p.name]
            existing.assetsCount += p.total_assets
            existing.id += `;${p.pack_ref}`
          } else {
            packs[p.name] = {
              id: `${p.pack_ref}`,
              name: p.name,
              creator: p.creator,
              assetsCount: p.total_assets
            }
          }
        }
        results["packs"] = Object.values(packs)
        this.cache.curPacks = results["packs"]
      } else {
        results["packs"] = foundry.utils.duplicate(this.cache.curPacks)
      }

      // process folders facets
      if("folders" in results) {
        results["folders"] = results["folders"].sort()
        this.cache.curFolders = results["folders"]
      } else {
        results["folders"] = foundry.utils.duplicate(this.cache.curFolders ? this.cache.curFolders : [])
      }

      // prepare filter packs for selected creator
      if(filters.creator && filters.creator.length > 0) {
        results["packs"] = results["packs"].filter((p : MouCollectionPack) => p.creator == filters.creator)
      } else {
        results["packs"] = []
      }

      // list of available packs
      //const visiblePacks = results["packs"].map((p: AnyDict) => Number(p.id))
      
      // prepare results
      const assets : MouCollectionCloudAsset[] = []
      for(const asset of results["assets"]) {
        // ignore assets that don't have a matching pack (ie. not visible)
        //if (!visiblePacks.includes(asset.pack_ref)) continue
        assets.push(new MouCollectionCloudAsset(asset))
      }
      results["assets"] = assets

      return results

    } catch(error: any) {
      this.error = MouCollectionCloudOnline.ERROR_SERVER_CNX
      this.cache = {}
      MouApplication.logError(this.APP_NAME, `Failed to search on Moulinette Cloud`, error)
      return { types: [], creators: [], packs: [], assets: [] }
    }
  }

  /** Collection Cloud has specific configurations */
  isConfigurable(): boolean {
    return false
  }

  isBrowsable(): boolean {
    return true;
  }

  /** Opens Configuration UI */
  configure(): void {
    return;
  }  

  getCollectionError(): string | null {
    if(this.error == MouCollectionCloudOnline.ERROR_SERVER_CNX) {
      return (game as Game).i18n.localize("MOU.error_server_connection")
    }
    return null;
  }
  
  async selectAsset(asset: MouCollectionAsset): Promise<string | null> {
    const assetData = await MouCloudClient.apiGET(`/asset/${asset.id}`, { session: MouApplication.getSettings(SETTINGS_SESSION_ID) })
    const resultDownload = await this.downloadAsset(assetData)
    return resultDownload ? resultDownload.path : null
  }

  setPickerMode(pickerMode: boolean) {
    pickerMode;
  }
}
