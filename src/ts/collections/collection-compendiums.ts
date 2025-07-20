import MouApplication from "../apps/application";
import MouBrowser from "../apps/browser";
import { MouCollection, MouCollectionAction, MouCollectionActionHint, MouCollectionAsset, MouCollectionAssetMeta, MouCollectionAssetType, MouCollectionAssetTypeEnum, MouCollectionCreator, MouCollectionDragData, MouCollectionFilters, MouCollectionPack, MouCollectionSearchResults } from "../apps/collection";
import MouLocalClient from "../clients/moulinette-local";
import { AnyDict } from "../types";
import MouFoundryUtils from "../utils/foundry-utils";
import MouMediaUtils from "../utils/media-utils";
import { CollectionCompendiumsUtils } from "./config/collection-compendiums-utils";

enum CompendiumAssetAction {
  DRAG,                     // drag & drop capability for the asset
  CLIPBOARD,                // copy path to clipboard
  VIEW,                     // open sheet (without importing)
  IMPORT,                   // import asset (scenes/...)
  CREATE_ARTICLE,           // create article from asset
  PREVIEW,                  // preview audio
}

class MouCollectionCompendiumAsset implements MouCollectionAsset {
  
  id: string;
  url: string;
  type: number;
  format: string;
  previewUrl: string;
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
  
  constructor(data: AnyDict, pack: AnyDict) {
    const assetType = MouCollectionAssetTypeEnum[pack.type as keyof typeof MouCollectionAssetTypeEnum]
    const thumbnail = MouFoundryUtils.getThumbnail(data, data.type)
    this.id = data.id;
    this.url = MouFoundryUtils.getImagePathFromEntity(data) || "";
    this.format = [MouCollectionAssetTypeEnum.Scene, MouCollectionAssetTypeEnum.Map].includes(assetType) ? "large" : "small"
    this.previewUrl = thumbnail ? thumbnail : "icons/svg/mystery-man.svg ",
    this.creator = pack.publisher
    this.creatorUrl = ""
    this.pack = pack.name
    this.pack_id = pack.packId
    this.name = data.name
    this.type = assetType
    this.meta = []
    this.draggable = true
    this.icon = MouMediaUtils.getIcon(assetType)
    this.icons = []
    this.flags = {}
    
    if(data.data && data.data.meta) {
      const infos = CollectionCompendiumsUtils.getInformationFromMeta(data.data)
      if(infos) {
        for(const meta of infos.meta) {
          this.meta.push({
            icon: meta.icon,
            text: meta.label,
            hint: "?"
          })
        }
        for(const flag of infos.flags) {
          this.icons.push({
            descr: flag.label,
            icon: flag.img
          })
        }
      }
    }
  }
}

export default class MouCollectionCompendiums implements MouCollection {

  APP_NAME = "MouCollectionCompendiums"

  static PLAYLIST_NAME = "Moulinette Compendiums"

  private compendiums: AnyDict
  private filteredAssets: any;

  constructor() {
    this.compendiums = {}
  }

  getId(): string {
    return "mou-compendiums"
  }

  async initialize(): Promise<void> {
    if(Object.keys(this.compendiums).length == 0) {
      this.compendiums = await MouLocalClient.indexAllCompendiums(false)
    }
  }

  getName(): string {
    return (game as Game).i18n.localize("MOU.collection_type_compendiums");
  }

  getDescription(): string {
    return (game as Game).i18n.localize("MOU.collection_type_compendiums_desc");
  }

  getSupportedTypes(): MouCollectionAssetTypeEnum[] {
    return [
      MouCollectionAssetTypeEnum.Actor, 
      MouCollectionAssetTypeEnum.Adventure, 
      MouCollectionAssetTypeEnum.Item, 
      MouCollectionAssetTypeEnum.JournalEntry, 
      MouCollectionAssetTypeEnum.Macro, 
      MouCollectionAssetTypeEnum.Playlist, 
      MouCollectionAssetTypeEnum.RollTable,
      MouCollectionAssetTypeEnum.Scene, 
    ];
  }

  async getTypes(): Promise<MouCollectionAssetType[]> {
    const types = {} as AnyDict
    //console.log(this.compendiums.packs)
    for(const pack of Object.values(this.compendiums.packs) as AnyDict[]) {
      if(pack.type in types) {
        types[pack.type] += pack.count
      } else {
        types[pack.type] = pack.count
      }
    }
    const results = [] as MouCollectionAssetType[]
    for(const [type, count] of Object.entries(types)) {
      if (type in MouCollectionAssetTypeEnum) {
        results.push({
          id: MouCollectionAssetTypeEnum[type as keyof typeof MouCollectionAssetTypeEnum],
          assetsCount: count
        })
      }      
    }
    return results
  }

  /**
   * Retrieves a list of creators for a given asset type from the compendiums.
   *
   * @param {MouCollectionAssetTypeEnum} type - The type of asset to filter creators by.
   * @returns {Promise<MouCollectionCreator[]>} A promise that resolves to an array of creators with their respective asset counts.
   */
  async getCreators(filters: MouCollectionFilters): Promise<MouCollectionCreator[]> {
    const creators = {} as AnyDict
    for(const pack of Object.values(this.compendiums.packs) as AnyDict[]) {
      // skip non-matching type
      if(MouCollectionAssetTypeEnum[pack.type as keyof typeof MouCollectionAssetTypeEnum] != filters.type) continue;
      if(pack.publisher in creators) {
        creators[pack.publisher] += pack.count
      } else {
        creators[pack.publisher] = pack.count
      }
    }
    const results = [] as MouCollectionCreator[]
    for(const [creator, count] of Object.entries(creators)) {
      results.push({
        id: creator,
        name: creator,
        assetsCount: count
      })
    }
    return results
  }

  async getPacks(filters: MouCollectionFilters): Promise<MouCollectionPack[]> {
    const results = [] as MouCollectionPack[]
    const creator = filters.creator || ""
    if(creator.length == 0) return results
    for(const pack of Object.values(this.compendiums.packs) as AnyDict[]) {
      // skip non-matching type
      if(MouCollectionAssetTypeEnum[pack.type as keyof typeof MouCollectionAssetTypeEnum] != filters.type) continue;
      // skip non-matching creator
      if(creator && pack.publisher != creator) continue;
      results.push({
        id: pack.packId,
        name: pack.name,
        assetsCount: pack.count
      })
    }
    return results
  }

  async getFolders(filters: MouCollectionFilters): Promise<string[]> {
    console.log(filters)
    return [] as string[]
  }

  /**
   * Retrieves the count of filtered assets.
   *
   * @returns {Promise<number>} A promise that resolves to the number of filtered assets.
   */
  async getAssetsCount(): Promise<number> {
    return this.filteredAssets ? this.filteredAssets.length : 0
  }

  async searchAssets(filters: MouCollectionFilters, page: number): Promise<MouCollectionSearchResults> {
    return {
      types: await this.getTypes(),
      creators: await this.getCreators(filters),
      packs: await this.getPacks(filters),
      assets: await this.getAssets(filters, page)
    }
  }

  /**
   * Retrieves a list of assets based on the provided filters and pagination.
   *
   * @param {MouCollectionFilters} filters - The filters to apply when searching for assets.
   * @param {number} page - The page number to retrieve, used for pagination.
   * @returns {Promise<MouCollectionAsset[]>} A promise that resolves to an array of assets matching the filters.
   *
   * The function performs the following steps:
   * 1. Initializes an empty results array.
   * 2. If the page is 0 or there are no cached filtered assets, it filters the compendium packs and assets based on the provided filters.
   * 3. Applies search terms, pack, type, and creator filters to the compendium packs.
   * 4. Filters the assets based on the filtered packs and search terms.
   * 5. Caches the filtered assets.
   * 6. Slices the filtered assets for the current page and pushes them to the results array.
   * 7. Returns the results array.
   */
  async getAssets(filters: MouCollectionFilters, page: number): Promise<MouCollectionAsset[]> {
    const results = [] as MouCollectionAsset[]
    
    // Search all assets that match the provided filters
    if(page == 0 || !this.filteredAssets) {
      const searchTerms = filters.searchTerms && filters.searchTerms.length >= 3 ? filters.searchTerms.split(" ") : []
      const packs = this.compendiums.packs.filter((p: AnyDict) => {
        // apply pack filter
        if(filters.pack && p.packId != filters.pack) return false
        // apply type filter
        if(MouCollectionAssetTypeEnum[p.type as keyof typeof MouCollectionAssetTypeEnum] != filters.type) return false;
        // apply creator filter
        if(filters.creator && filters.creator.length > 0 && p.publisher != filters.creator) return false
        return true
      })
      const packIdx = packs.map((p: AnyDict) => p.idx)
      this.filteredAssets = this.compendiums.assets.filter((a: AnyDict) => {
        // apply filters
        for(const term of searchTerms) {
          if(a.name.toLowerCase().indexOf(term.toLowerCase()) < 0) return false
        }
        return packIdx.includes(a.pack)
      })
    }
  
    const fromIdx = page * MouBrowser.PAGE_SIZE
    if(fromIdx >= this.filteredAssets.length) return []
    for(const data of this.filteredAssets.slice(fromIdx, fromIdx + MouBrowser.PAGE_SIZE)) {
      results.push(new MouCollectionCompendiumAsset(data, this.compendiums.packs[data.pack]))
    }
    return results
  }

  /**
   * Generates a list of actions available for a given collection asset.
   *
   * @param asset - The collection asset for which actions are to be generated.
   * @returns An array of actions that can be performed on the given asset.
   */
  getActions(asset: MouCollectionAsset): MouCollectionAction[] {
    const actions = [] as MouCollectionAction[]
    const cAsset = (asset as MouCollectionCompendiumAsset)
    const assetType = MouCollectionAssetTypeEnum[asset.type]
    const isGM = (game as Game).user?.isGM
    switch(cAsset.type) {
      case MouCollectionAssetTypeEnum.Scene:
      case MouCollectionAssetTypeEnum.Map:
        if(isGM) {
          actions.push({ id: CompendiumAssetAction.IMPORT, name: (game as Game).i18n.format("MOU.action_import", { type: assetType}), icon: "fa-solid fa-file-import" })
          actions.push({ id: CompendiumAssetAction.CREATE_ARTICLE, name: (game as Game).i18n.localize("MOU.action_create_article"), icon: "fa-solid fa-book-open" })
        }
        actions.push({ id: CompendiumAssetAction.VIEW, small: true, name: (game as Game).i18n.localize("MOU.action_view"), icon: "fa-solid fa-eye" })
        break; 
      case MouCollectionAssetTypeEnum.Item:
      case MouCollectionAssetTypeEnum.Actor:
        actions.push({ id: CompendiumAssetAction.DRAG, drag: true, name: (game as Game).i18n.format("MOU.action_drag", { type: assetType}), icon: "fa-solid fa-hand" })
        if(isGM) {
          actions.push({ id: CompendiumAssetAction.IMPORT, name: (game as Game).i18n.format("MOU.action_import", { type: assetType}), icon: "fa-solid fa-file-import" })
          actions.push({ id: CompendiumAssetAction.CREATE_ARTICLE, name: (game as Game).i18n.localize("MOU.action_create_article"), icon: "fa-solid fa-book-open" })
        }
        actions.push({ id: CompendiumAssetAction.VIEW, small: true, name: (game as Game).i18n.localize("MOU.action_view"), icon: "fa-solid fa-eye" })
        break;    
      case MouCollectionAssetTypeEnum.RollTable:
        if(isGM) {
          actions.push({ id: CompendiumAssetAction.IMPORT, name: (game as Game).i18n.format("MOU.action_import", { type: assetType}), icon: "fa-solid fa-file-import" })
        }
        break;
      case MouCollectionAssetTypeEnum.JournalEntry:
      case MouCollectionAssetTypeEnum.Macro:
        actions.push({ id: CompendiumAssetAction.DRAG, drag: true, name: (game as Game).i18n.format("MOU.action_drag", { type: assetType}), icon: "fa-solid fa-hand" })
        if(isGM) {
          actions.push({ id: CompendiumAssetAction.IMPORT, name: (game as Game).i18n.format("MOU.action_import", { type: assetType}), icon: "fa-solid fa-file-import" })
        }
        actions.push({ id: CompendiumAssetAction.VIEW, small: true, name: (game as Game).i18n.localize("MOU.action_view"), icon: "fa-solid fa-eye" })
        break
    }
    actions.push({ id: CompendiumAssetAction.CLIPBOARD, small: true, name: (game as Game).i18n.localize("MOU.action_clipboard"), icon: "fa-solid fa-clipboard" })
    
    return actions
  }

  getActionHint(asset: MouCollectionAsset, actionId: number): MouCollectionActionHint | null {
    const action = this.getActions(asset).find(a => a.id == actionId)
    if(!action) return null
    switch(actionId) {
      case CompendiumAssetAction.DRAG:
        switch(asset.type) {
          case MouCollectionAssetTypeEnum.Item: return { name: action.name, description: (game as Game).i18n.localize("MOU.action_hint_drag_item") }
          case MouCollectionAssetTypeEnum.Actor: return { name: action.name, description: (game as Game).i18n.localize("MOU.action_hint_drag_actor") }
          case MouCollectionAssetTypeEnum.JournalEntry: return { name: action.name, description: (game as Game).i18n.localize("MOU.action_hint_drag_journalentry") }
          case MouCollectionAssetTypeEnum.Macro: return { name: action.name, description: (game as Game).i18n.localize("MOU.action_hint_drag_macro") }
        }
        break
      case CompendiumAssetAction.IMPORT:
        switch(asset.type) {
          case MouCollectionAssetTypeEnum.Map: return { name: action.name, description: (game as Game).i18n.localize("MOU.action_hint_import_image") }
          case MouCollectionAssetTypeEnum.Scene: return { name: action.name, description: (game as Game).i18n.localize("MOU.action_hint_import_asset") }
          case MouCollectionAssetTypeEnum.Item: return { name: action.name, description: (game as Game).i18n.localize("MOU.action_hint_import_asset") }
          case MouCollectionAssetTypeEnum.Actor: return { name: action.name, description: (game as Game).i18n.localize("MOU.action_hint_import_asset") }
          case MouCollectionAssetTypeEnum.RollTable: return { name: action.name, description: (game as Game).i18n.localize("MOU.action_hint_import_rolltable") }
        }
        break
      case CompendiumAssetAction.CLIPBOARD:
        return { name: action.name, description: (game as Game).i18n.localize("MOU.action_hint_clipboard") }
      case CompendiumAssetAction.CREATE_ARTICLE:
        return { name: action.name, description: (game as Game).i18n.localize("MOU.action_hint_create_article_asset") }
      case CompendiumAssetAction.VIEW:
        return { name: action.name, description: (game as Game).i18n.localize("MOU.action_hint_view_asset") }
      case CompendiumAssetAction.PREVIEW:
        switch(asset.type) {
          case MouCollectionAssetTypeEnum.Audio: return { name: action.name, description: (game as Game).i18n.localize("MOU.action_hint_preview_audio") }
        }
        break
    }
    return null
  }

  async executeAction(actionId: number, asset: MouCollectionAsset): Promise<void> {
    const folderPath = `Moulinette/${asset.creator}/${asset.pack}`
    switch(actionId) {
      case CompendiumAssetAction.DRAG:
        ui.notifications?.info((game as Game).i18n.localize("MOU.dragdrop_instructions"))
        break
      
      case CompendiumAssetAction.CLIPBOARD:
        MouMediaUtils.copyToClipboard(asset.url)
        break

      case CompendiumAssetAction.VIEW:
        const itemEl = await fromUuid(asset.id)
        if(itemEl) {
          // @ts-ignore
          itemEl.sheet.render(true)
        }
        break
      
      case CompendiumAssetAction.IMPORT:
        const id = asset.id.split(".").pop()
        const pack = (game as Game).packs.get(asset.pack_id!)
        const collection = (game as Game).collections.get(MouCollectionAssetTypeEnum[asset.type]);
        if(pack && collection && id) {  
          const document = await collection.importFromCompendium(pack, id, {}, { renderSheet: true}) as any
          const folder = await MouFoundryUtils.getOrCreateFolder(MouCollectionAssetTypeEnum[asset.type] as foundry.CONST.FOLDER_DOCUMENT_TYPES, folderPath)
          // move entity into right folder
          if(document && folder) {
            document.update({ folder: folder.id })
          }
        } else {
          MouApplication.logWarn(this.APP_NAME, `No matching pack (${asset.pack_id} or no matching collection (${MouCollectionAssetTypeEnum[asset.type]}) or no matching asset with id (${id})!`)
        }
        break

      case CompendiumAssetAction.CREATE_ARTICLE:
        switch(asset.type) {
          case MouCollectionAssetTypeEnum.Scene: 
          case MouCollectionAssetTypeEnum.Item: 
          case MouCollectionAssetTypeEnum.Actor: 
            const data = await fromUuid(asset.id) as AnyDict
            MouFoundryUtils.createJournalImageFromEntity(data, folderPath); 
            break
        }
        break
    }
  }

  async fromDropData(assetId: string, data: MouCollectionDragData): Promise<void> {
    data.uuid = assetId
  }

  async dropDataCanvas(): Promise<void> {
    MouApplication.logInfo(this.APP_NAME, `Using default FVTT drag & drop implementation.`)
  }

  isConfigurable(): boolean {
    return false;
  }

  isBrowsable(): boolean {
    return true;
  }

  configure(callback: Function): void {
    if(callback) {
      return callback()
    }
  }

  getCollectionError(): string | null {
    return null;
  }
  
  supportsType(type: MouCollectionAssetTypeEnum): boolean {
    return [
      MouCollectionAssetTypeEnum.Actor, 
      MouCollectionAssetTypeEnum.Adventure, 
      MouCollectionAssetTypeEnum.Item, 
      MouCollectionAssetTypeEnum.JournalEntry, 
      MouCollectionAssetTypeEnum.Macro, 
      MouCollectionAssetTypeEnum.Playlist, 
      MouCollectionAssetTypeEnum.RollTable,
      MouCollectionAssetTypeEnum.Scene].includes(type)
  }

  async selectAsset(asset: MouCollectionAsset): Promise<string | null> {
    return asset.url
  }

  setPickerMode(pickerMode: boolean) {
    pickerMode; // unused
  }
}
