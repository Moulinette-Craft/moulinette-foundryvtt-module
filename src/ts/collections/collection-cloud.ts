import MouApplication from "../apps/application";
import MouCloudClient from "../clients/moulinette-cloud";
import MouFileManager from "../utils/file-manager";
import MouMediaUtils from "../utils/media-utils";

import { MouCollection, MouCollectionAction, MouCollectionActionHint, MouCollectionAsset, MouCollectionAssetMeta, MouCollectionAssetType, MouCollectionAssetTypeEnum, MouCollectionCreator, MouCollectionDragData, MouCollectionFilters, MouCollectionPack, MouCollectionSearchResults } from "../apps/collection";
import { MOU_STORAGE, MOU_STORAGE_PUB, SETTINGS_COLLECTION_CLOUD, SETTINGS_SESSION_ID } from "../constants";
import { AnyDict } from "../types";
import MouFoundryUtils from "../utils/foundry-utils";
import CloudCollectionConfig from "./config/collection-cloud-config";
import MouPreview from "../apps/preview";

export enum CloudMode {
  ALL = "cloud-all",                          // all assets including non-accessible
  ALL_ACCESSIBLE = "cloud-accessible",        // all assets the user can access
  ONLY_SUPPORTED_CREATORS = "cloud-supported" // only assets from creators the user actively supports
}

enum CloudAssetType {
  PREVIEW,                  // asset is a preview (no access, requires membership)
  FREE,                     // asset is a freebe from creator
  AVAILABLE,                // asset is available (but not free)
}

enum CloudAssetAction {
  DRAG,                     // drag & drop capability for the asset
  DOWNLOAD,                 // download asset and copy path to clipboard
  IMPORT,                   // import asset (scenes/...)
  CREATE_ARTICLE,           // create article from asset
  MEMBERSHIP,               // creator support page,
  PREVIEW,                  // preview audio,
  SCENEPACKER,              // visit scene packer page
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
  iconTL?: {descr: string, icon?: string, text?: string};
  iconTR?: {descr: string, icon?: string, text?: string};
  draggable?: boolean;
  flags: AnyDict;

  // specific to MouCollectionCloud
  cloud_type: number; 
  
  constructor(data: AnyDict) {
    this.id = data._id;
    if([MouCollectionAssetTypeEnum.Scene, MouCollectionAssetTypeEnum.Map, MouCollectionAssetTypeEnum.ScenePacker].includes(data.type)) {
      this.format = "large"
    } else if (data.type == MouCollectionAssetTypeEnum.Image) {
      this.format = "tiny"
    } else {
      this.format = "small"
    }
    const basePath = MouMediaUtils.getBasePath(data.filepath)
    this.url = data.filepath
    this.previewUrl = `${MOU_STORAGE_PUB}${data.pack.creator_ref}/${data.pack.path}/${basePath}.${data.type == MouCollectionAssetTypeEnum.Audio ? "ogg" : "webp"}`
    this.background_color = [MouCollectionAssetTypeEnum.Scene, MouCollectionAssetTypeEnum.Map, MouCollectionAssetTypeEnum.ScenePacker].includes(data.type) ? data.main_color : null
    this.creator = data.pack.creator
    this.creatorUrl = data.creator_url
    this.pack = data.pack.name
    this.pack_id = data.pack_ref
    this.name = data.name && data.name.length > 0 ? data.name : MouMediaUtils.prettyMediaName(data.filepath)
    this.type = data.type;
    this.meta = []
    this.icon = MouMediaUtils.getIcon(data.type)
    this.icons = []
    this.flags = {}
    if(data.filepath.endsWith(".webm") || data.filepath.endsWith(".mp4")) {
      this.icons.push({descr: (game as Game).i18n.localize("MOU.asset_is_animated"), icon: "fa-solid fa-film"})
    }

    if(data.perms == 0) {
      this.icons.push({descr: (game as Game).i18n.localize("MOU.pack_is_free"), icon: "fa-solid fa-gift"})
      this.cloud_type = CloudAssetType.FREE
      if(data.type != MouCollectionAssetTypeEnum.Audio) {
        this.previewUrl = `${MOU_STORAGE}${data.pack.creator_ref}/${data.pack.path}/${data.thumb}`
      }
    } else if (data.perms < 0) {
      this.cloud_type = CloudAssetType.PREVIEW
    } else {
      this.cloud_type = CloudAssetType.AVAILABLE
      if(data.type != MouCollectionAssetTypeEnum.Audio) {
        this.previewUrl = `${MOU_STORAGE}${data.pack.creator_ref}/${data.pack.path}/${data.thumb}`
      }
    }
    
    switch(data.type) {
      case MouCollectionAssetTypeEnum.Macro:
      case MouCollectionAssetTypeEnum.Item:
      case MouCollectionAssetTypeEnum.Actor:
        this.draggable = true && data.perms >= 0
        break
      case MouCollectionAssetTypeEnum.Audio:
        this.draggable = true && data.perms >= 0
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
      case MouCollectionAssetTypeEnum.ScenePacker:
        this.iconTL = {descr: (game as Game).i18n.localize("MOU.scene_packer"), icon: "mou-icon mou-scenepacker"}
      case MouCollectionAssetTypeEnum.Scene:
        if(data.scene.width) {
          this.meta.push({ 
            icon: "fa-regular fa-border-all", 
            text: `${data.scene.width} x ${data.scene.height}`,
            hint: (game as Game).i18n.localize("MOU.meta_scene_dims")
          })
        } else {
          if(data.size) {
            this.meta.push({ 
              icon: "fa-regular fa-expand-wide", 
              text: `${MouMediaUtils.prettyNumber(data.size.width, true)} x ${MouMediaUtils.prettyNumber(data.size.height, true)}`,
              hint: (game as Game).i18n.localize("MOU.meta_media_size")
            })
          }
        }
        if(!this.pack) {
          console.error("Scene without pack", data)
        }

        if(data.scene.hasWalls) this.icons.push({descr: (game as Game).i18n.localize("MOU.scene_has_walls"), icon: "fa-solid fa-block-brick"})
        if(data.scene.hasLights) this.icons.push({descr: (game as Game).i18n.localize("MOU.scene_has_lights"), icon: "fa-regular fa-lightbulb"})
        if(data.scene.hasSounds) this.icons.push({descr: (game as Game).i18n.localize("MOU.scene_has_sounds"), icon: "fa-solid fa-music"})
        if(data.scene.hasTokens) this.icons.push({descr: (game as Game).i18n.localize("MOU.scene_has_tokens"), icon: "fa-solid fa-user-alt"})
        if(data.scene.hasTiles) this.icons.push({descr: (game as Game).i18n.localize("MOU.scene_has_tiles"), icon: "fa-solid fa-cubes"})
        if(data.scene.hasDrawings) this.icons.push({descr: (game as Game).i18n.localize("MOU.scene_has_drawings"), icon: "fa-solid fa-pencil-alt"})
        if(data.scene.hasNotes) this.icons.push({descr: (game as Game).i18n.localize("MOU.scene_has_notes"), icon: "fa-solid fa-bookmark"})
        if(this.pack && this.pack.toUpperCase().endsWith("HD") || this.name.toUpperCase().endsWith("HD")) { 
          this.iconTR = {descr: (game as Game).i18n.localize("MOU.scene_hd"), text: "HD"}
        }
        if(this.pack && this.pack.toUpperCase().endsWith("4K") || this.name.toUpperCase().endsWith("4K")) { 
          this.iconTR = {descr: (game as Game).i18n.localize("MOU.scene_4k"), text: "4K"}
        }
        break
      case MouCollectionAssetTypeEnum.Image:
        this.draggable = true && data.perms >= 0
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
          text: `${data.pdf?.pages} ` + (game as Game).i18n.localize(data.pdf.pages > 1 ? "MOU.pages" : "MOU.page"),
          hint: (game as Game).i18n.localize("MOU.meta_pdf_pages")
        })
        break
      case MouCollectionAssetTypeEnum.Playlist:
        if(data.playlist?.sounds) {
          this.meta.push({ 
            icon: "fa-regular fa-music", 
            text: `${data.playlist.sounds} ` + (game as Game).i18n.localize(data.playlist.sounds > 1 ? "MOU.tracks" : "MOU.track"),
            hint: (game as Game).i18n.localize("MOU.meta_playlist_tracks")
          })
        }
        break
      case MouCollectionAssetTypeEnum.JournalEntry:
        if(data.journal?.pages) {
          this.meta.push({ 
            icon: "fa-regular fa-file-lines", 
            text: `${data.journal.pages} ` + (game as Game).i18n.localize(data.journal.pages > 1 ? "MOU.pages" : "MOU.page"),
            hint: (game as Game).i18n.localize("MOU.meta_journal_pages")
          })
        }
        break
    }
    this.meta.push({ 
      icon: "fa-regular fa-weight-hanging",
      text: MouMediaUtils.prettyFilesize(data.filesize, 0),
      hint: (game as Game).i18n.localize("MOU.meta_filesize")})
  }
}

interface MouCollectionCloudCache {
  currentSearchTerms?: string,
  curScope?: CloudMode,
  curType?: number,
  curTypes?: MouCollectionAssetType[],
  curCreators?: MouCollectionCreator[],
  curPacks?: MouCollectionPack[],
  curFolders?: string[]
}

export default class MouCollectionCloud implements MouCollection {

  APP_NAME = "MouCollectionCloud"

  static PLAYLIST_NAME = "Moulinette Cloud"

  static ERROR_SERVER_CNX = 1

  private mode: CloudMode
  private error: number

  private cache: MouCollectionCloudCache

  constructor() {
    this.mode = CloudMode.ALL
    this.refreshSettings();
    this.error = 0
    this.cache = {}
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

  getDescription(): string {
    return (game as Game).i18n.localize("MOU.collection_type_cloud_desc");
  }

  private getScope() {
    return {
      session: MouApplication.getSettings(SETTINGS_SESSION_ID),
      mode: this.mode
    }
  }

  getSupportedTypes(): MouCollectionAssetTypeEnum[] {
    return [
      MouCollectionAssetTypeEnum.Actor, 
      MouCollectionAssetTypeEnum.Adventure, 
      MouCollectionAssetTypeEnum.Audio, 
      MouCollectionAssetTypeEnum.Image, 
      MouCollectionAssetTypeEnum.Item, 
      MouCollectionAssetTypeEnum.JournalEntry, 
      MouCollectionAssetTypeEnum.Macro, 
      MouCollectionAssetTypeEnum.Map, 
      MouCollectionAssetTypeEnum.PDF, 
      MouCollectionAssetTypeEnum.Playlist, 
      MouCollectionAssetTypeEnum.RollTable
    ];
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
      this.error = MouCollectionCloud.ERROR_SERVER_CNX
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
      this.error = MouCollectionCloud.ERROR_SERVER_CNX
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
      this.error = MouCollectionCloud.ERROR_SERVER_CNX
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
      this.error = MouCollectionCloud.ERROR_SERVER_CNX
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
        // merge packs with same name
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
      this.error = MouCollectionCloud.ERROR_SERVER_CNX
      this.cache = {}
      MouApplication.logError(this.APP_NAME, `Failed to search on Moulinette Cloud`, error)
      return { types: [], creators: [], packs: [], assets: [] }
    }
  }

  getActions(asset: MouCollectionAsset): MouCollectionAction[] {
    const actions = [] as MouCollectionAction[]
    const cAsset = (asset as MouCollectionCloudAsset)
    if(cAsset.cloud_type == CloudAssetType.PREVIEW) {
      if(cAsset.type == MouCollectionAssetTypeEnum.Audio && asset.flags.hasAudioPreview) {
        actions.push({ id: CloudAssetAction.PREVIEW, name: (game as Game).i18n.localize("MOU.action_preview"), icon: "fa-solid fa-headphones" })
      }
      actions.push({ id: CloudAssetAction.MEMBERSHIP, name: (game as Game).i18n.localize("MOU.action_support"), small: cAsset.type == MouCollectionAssetTypeEnum.Image,  icon: "fa-solid fa-hands-praying" })
      return actions
    }
    
    const assetType = MouCollectionAssetTypeEnum[asset.type]
    switch(cAsset.type) {
      case MouCollectionAssetTypeEnum.ScenePacker:
        actions.push({ id: CloudAssetAction.IMPORT, name: (game as Game).i18n.format("MOU.action_import", { type: "w. ScenePacker"}), icon: "fa-solid fa-file-import" })
        break;
      case MouCollectionAssetTypeEnum.Scene:
      case MouCollectionAssetTypeEnum.Map:
        actions.push({ id: CloudAssetAction.IMPORT, name: (game as Game).i18n.format("MOU.action_import", { type: assetType}), icon: "fa-solid fa-file-import" })
        actions.push({ id: CloudAssetAction.CREATE_ARTICLE, name: (game as Game).i18n.localize("MOU.action_create_article"), icon: "fa-solid fa-book-open" })
        actions.push({ id: CloudAssetAction.PREVIEW, small: true, name: (game as Game).i18n.localize("MOU.action_preview_asset"), icon: "fa-solid fa-eyes" })
        break; 
      case MouCollectionAssetTypeEnum.Item:
      case MouCollectionAssetTypeEnum.Actor:
        actions.push({ id: CloudAssetAction.DRAG, drag: true, name: (game as Game).i18n.format("MOU.action_drag", { type: assetType}), icon: "fa-solid fa-hand" })
        actions.push({ id: CloudAssetAction.IMPORT, name: (game as Game).i18n.format("MOU.action_import", { type: assetType}), icon: "fa-solid fa-file-import" })
        actions.push({ id: CloudAssetAction.CREATE_ARTICLE, name: (game as Game).i18n.localize("MOU.action_create_article"), icon: "fa-solid fa-book-open" })
        break;    
      case MouCollectionAssetTypeEnum.Image:
        //actions.push({ id: CloudAssetAction.DRAG, drag: true, small: true, name: (game as Game).i18n.format("MOU.action_drag", { type: assetType}), icon: "fa-solid fa-hand" })
        actions.push({ id: CloudAssetAction.CREATE_ARTICLE, small: true, name: (game as Game).i18n.localize("MOU.action_create_article"), icon: "fa-solid fa-book-open" })
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
      case MouCollectionAssetTypeEnum.JournalEntry:
        actions.push({ id: CloudAssetAction.IMPORT, name: (game as Game).i18n.format("MOU.action_import", { type: assetType}), icon: "fa-solid fa-file-import" })
        break;
      case MouCollectionAssetTypeEnum.Playlist:
        actions.push({ id: CloudAssetAction.IMPORT, name: (game as Game).i18n.localize("MOU.action_audio_play"), icon: "fa-solid fa-play-pause" })
        break;    
    }

    if(cAsset.type != MouCollectionAssetTypeEnum.ScenePacker) {
      actions.push({ id: CloudAssetAction.DOWNLOAD, small: true, name: (game as Game).i18n.localize("MOU.action_download"), icon: "fa-solid fa-cloud-arrow-down" })
    } else {
      actions.push({ id: CloudAssetAction.SCENEPACKER, small: true, name: (game as Game).i18n.localize("MOU.action_scenepacker_page"), icon: "mou-icon mou-scenepacker" })
    }
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
          case MouCollectionAssetTypeEnum.Playlist: return { name: action.name, description: (game as Game).i18n.localize("MOU.action_hint_download_import_playlist") }
          case MouCollectionAssetTypeEnum.JournalEntry: return { name: action.name, description: (game as Game).i18n.localize("MOU.action_hint_download_import_journal") }
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
          case MouCollectionAssetTypeEnum.Scene: 
          case MouCollectionAssetTypeEnum.Image: 
          case MouCollectionAssetTypeEnum.Map: 
            return { name: action.name, description: (game as Game).i18n.localize("MOU.action_hint_preview_asset") }
        }
        break;
      case CloudAssetAction.SCENEPACKER:
        return { name: action.name, description: (game as Game).i18n.localize("MOU.action_hint_scene_packer_page") }
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
  private async downloadAsset(asset: any): Promise<FilePicker.UploadResult | false> {
    if(asset.type == MouCollectionAssetTypeEnum.ScenePacker) {
      const assets = await MouApplication.getModule().cloudclient.apiPOST(`/scenepacker-assets/${asset.pack_ref}`, { scope: this.getScope() })
      return {
        path: "",
        message: JSON.stringify(assets),
        status: "success",
      }
    }
    if(!asset.base_url?.startsWith(MouCloudClient.AZURE_BASEURL)) {
      throw new Error("Invalid BaseURL?")
    }
    const targetPath = MouApplication.getModule().cloudclient.getDefaultDownloadFolder(asset.base_url)
    const baseURL = await MouFileManager.getBaseURL()
    const targetPathBaseURL = baseURL ? baseURL + targetPath : targetPath

    // FVTT entity
    if(asset.filepath.endsWith(".json")) {
      await MouFileManager.downloadAllFiles(asset.deps, asset.base_url, targetPath)
      const entityString = await MouFileManager.downloadFileAsString(`${asset.base_url}/${asset.file_url}`)
      if(entityString.length > 0) {
        // replace all #DEPS#
        return {
          path: targetPathBaseURL,
          message: entityString.replace(new RegExp("#DEP#", "g"), targetPathBaseURL + "/"),
          status: "success",
        }
      }
      return false
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
        const resultImport = await this.downloadAsset(asset)
        if(resultImport) {
          switch(asset.type) {
            case MouCollectionAssetTypeEnum.Map: MouFoundryUtils.importSceneFromMap(resultImport.path, folderPath); break
            case MouCollectionAssetTypeEnum.Scene: MouFoundryUtils.importSceneFromJSON(resultImport.message, folderPath); break
            case MouCollectionAssetTypeEnum.Item: MouFoundryUtils.importItem(JSON.parse(resultImport.message), folderPath); break
            case MouCollectionAssetTypeEnum.Actor: MouFoundryUtils.importActor(JSON.parse(resultImport.message), folderPath); break
            case MouCollectionAssetTypeEnum.Audio: MouFoundryUtils.playStopSound(resultImport.path, MouCollectionCloud.PLAYLIST_NAME); break
            case MouCollectionAssetTypeEnum.Playlist: MouFoundryUtils.importPlaylist(JSON.parse(resultImport.message), folderPath); break
            case MouCollectionAssetTypeEnum.JournalEntry: MouFoundryUtils.importJournalEntry(JSON.parse(resultImport.message), folderPath); break
            case MouCollectionAssetTypeEnum.ScenePacker: MouFoundryUtils.importScenePacker(JSON.parse(resultImport.message), asset.scenepacker_ref); break
          }
        }
        break
      case CloudAssetAction.CREATE_ARTICLE:
        const resultArticle = await this.downloadAsset(asset)
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
        const resultDownload = await this.downloadAsset(asset)
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
            console.log(selAsset)
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
            const jsonData = await MouFileManager.downloadFileAsString(`${asset.base_url}/${asset.file_url}`)
            if(jsonData.length > 0) {
              const imagePath = MouFoundryUtils.getImagePathFromEntity(JSON.parse(jsonData));
              if(imagePath) {
                const depPath = imagePath.replace("#DEP#", "")
                const dep = asset.deps.find((d : string) => d.startsWith(depPath))
                if(dep) {
                  (new MouPreview(`${asset.base_url}/${dep}`)).render(true)  
                } else {
                  MouApplication.logError(this.APP_NAME, `Failed to find matching dependency ${depPath}`)
                }
              } else {
                MouApplication.logError(this.APP_NAME, `Failed to get image from scene ${asset.file_url.split("?")[0]}`)  
              }
            } else {
              MouApplication.logError(this.APP_NAME, `Failed to download scene data for ${asset.file_url.split("?")[0]}`)
            }
            break
          case MouCollectionAssetTypeEnum.Image:
          case MouCollectionAssetTypeEnum.Map:
            (new MouPreview(`${asset.base_url}/${asset.file_url}`)).render(true)
            break;
        }
        break
      
      case CloudAssetAction.MEMBERSHIP:
        const cAsset = asset as AnyDict
        var win = window.open(cAsset.creator_url, '_blank');
        if (win) { 
          win.focus();
        }
        break;
      
      case CloudAssetAction.SCENEPACKER:
        var win = window.open("https://foundryvtt.com/packages/scene-packer/", '_blank');
        if (win) { 
          win.focus();
        }
        break;
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
        case MouCollectionAssetTypeEnum.Actor: 
          const folderPath = `Moulinette/${asset.creator}/${asset.pack}`
          const resultActor = await this.downloadAsset(asset)
          if(resultActor) {
            const actor = await MouFoundryUtils.importActor(JSON.parse(resultActor.message), folderPath, false) as AnyDict;
            if(actor) {
              data.uuid = actor.uuid
            }
          }
          break
        case MouCollectionAssetTypeEnum.Macro: 
        case MouCollectionAssetTypeEnum.Item: 
          const result = await this.downloadAsset(asset)  
          if(result) {
            data.data = JSON.parse(result.message) as AnyDict
          }
          break
      }
    }
  }

  async dropDataCanvas(canvas: Canvas, selAsset: MouCollectionAsset, data: AnyDict): Promise<void> {
    selAsset; // unused
    const position = {x: data.x, y: data.y }
    const asset = await MouCloudClient.apiGET(`/asset/${data.moulinette.asset}`, { session: MouApplication.getSettings(SETTINGS_SESSION_ID) })    
    if(asset) {
      const result = await this.downloadAsset(asset)  
      if(result) {
        MouFoundryUtils.createCanvasAsset(canvas, result.path, data.type, `Moulinette/${asset.creator}/${asset.pack}`, position)
      }
    }
  }

  /** Collection Cloud has specific configurations */
  isConfigurable(): boolean {
    return true
  }

  isBrowsable(): boolean {
    return true;
  }

  /** Opens Configuration UI */
  configure(callback: Function): void {
    const parent = this
    new CloudCollectionConfig(function() {
      parent.refreshSettings()
      callback()
    }).render(true)
  }  

  getCollectionError(): string | null {
    if(this.error == MouCollectionCloud.ERROR_SERVER_CNX) {
      return (game as Game).i18n.localize("MOU.error_server_connection")
    }
    return null;
  }

  supportsType(type: MouCollectionAssetTypeEnum): boolean {
    return [
      MouCollectionAssetTypeEnum.Actor, 
      MouCollectionAssetTypeEnum.Adventure, 
      MouCollectionAssetTypeEnum.Audio, 
      //MouCollectionAssetTypeEnum.Icon, 
      MouCollectionAssetTypeEnum.Image, 
      MouCollectionAssetTypeEnum.Item, 
      MouCollectionAssetTypeEnum.JournalEntry, 
      MouCollectionAssetTypeEnum.Macro, 
      MouCollectionAssetTypeEnum.Map, 
      MouCollectionAssetTypeEnum.PDF, 
      MouCollectionAssetTypeEnum.Playlist, 
      MouCollectionAssetTypeEnum.RollTable,
      MouCollectionAssetTypeEnum.Scene,
      MouCollectionAssetTypeEnum.ScenePacker].includes(type)
  }
  
  async selectAsset(asset: MouCollectionAsset): Promise<string | null> {
    const assetData = await MouCloudClient.apiGET(`/asset/${asset.id}`, { session: MouApplication.getSettings(SETTINGS_SESSION_ID) })
    const resultDownload = await this.downloadAsset(assetData)
    return resultDownload ? resultDownload.path : null
  }
}
