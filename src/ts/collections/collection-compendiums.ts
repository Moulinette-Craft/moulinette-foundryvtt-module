import MouApplication from "../apps/application";
import MouBrowser from "../apps/browser";
import { MouCollection, MouCollectionAction, MouCollectionActionHint, MouCollectionAsset, MouCollectionAssetMeta, MouCollectionAssetType, MouCollectionAssetTypeEnum, MouCollectionCreator, MouCollectionDragData, MouCollectionFilters, MouCollectionPack } from "../apps/collection";
import MouLocalClient from "../clients/moulinette-local";
import { AnyDict } from "../types";
import MouFoundryUtils from "../utils/foundry-utils";
import MouMediaUtils from "../utils/media-utils";

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
  type: number;
  format: string;
  preview: string;
  creator: string;
  creator_url: string;
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
    const thumbnail = MouLocalClient.getThumbnail(data, data.type)
    this.id = data.id;
    this.format = [MouCollectionAssetTypeEnum.Scene, MouCollectionAssetTypeEnum.Map].includes(assetType) ? "large" : "small"
    this.preview = thumbnail ? thumbnail : "icons/svg/mystery-man.svg ",
    this.creator = pack.publisher
    this.creator_url = ""
    this.pack = pack.name
    this.pack_id = pack.packId
    this.name = data.name
    this.type = assetType
    this.meta = []
    this.draggable = true
    this.icon = MouMediaUtils.getIcon(assetType)
    this.icons = []
    this.flags = {}
  }
}

export default class MouCollectionCompendiums implements MouCollection {

  APP_NAME = "MouCollectionCompendiums"

  static PLAYLIST_NAME = "Moulinette Compendiums"

  private compendiums: AnyDict

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

  async getTypes(): Promise<MouCollectionAssetType[]> {
    const types = {} as AnyDict
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

  async getCreators(type: MouCollectionAssetTypeEnum): Promise<MouCollectionCreator[]> {
    const creators = {} as AnyDict
    for(const pack of Object.values(this.compendiums.packs) as AnyDict[]) {
      // skip non-matching type
      if(MouCollectionAssetTypeEnum[pack.type as keyof typeof MouCollectionAssetTypeEnum] != type) continue;
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

  async getPacks(type: MouCollectionAssetTypeEnum, creator: string): Promise<MouCollectionPack[]> {
    const results = [] as MouCollectionPack[]
    if(creator.length == 0) return results
    for(const pack of Object.values(this.compendiums.packs) as AnyDict[]) {
      // skip non-matching type
      if(MouCollectionAssetTypeEnum[pack.type as keyof typeof MouCollectionAssetTypeEnum] != type) continue;
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

  async getAssets(filters: MouCollectionFilters, page: number): Promise<MouCollectionAsset[]> {
    const results = [] as MouCollectionAsset[]
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
    const filteredAssets = this.compendiums.assets.filter((a: AnyDict) => {
      // apply filters
      for(const term of searchTerms) {
        if(a.name.toLowerCase().indexOf(term.toLowerCase()) < 0) return false
      }
      return packIdx.includes(a.pack)
    })

    const fromIdx = page * MouBrowser.PAGE_SIZE
    if(fromIdx >= filteredAssets.length) return []
    for(const data of filteredAssets.slice(fromIdx, fromIdx + MouBrowser.PAGE_SIZE)) {
      results.push(new MouCollectionCompendiumAsset(data, this.compendiums.packs[data.pack]))
    }
    return results
  }

  getRandomAssets(filters: MouCollectionFilters): Promise<MouCollectionAsset[]> {
    throw new Error("Method not implemented." + filters);
  }

  getActions(asset: MouCollectionAsset): MouCollectionAction[] {
    const actions = [] as MouCollectionAction[]
    const cAsset = (asset as MouCollectionCompendiumAsset)
    const assetType = MouCollectionAssetTypeEnum[asset.type]
    switch(cAsset.type) {
      case MouCollectionAssetTypeEnum.Scene:
      case MouCollectionAssetTypeEnum.Map:
        actions.push({ id: CompendiumAssetAction.IMPORT, name: (game as Game).i18n.format("MOU.action_import", { type: assetType}), icon: "fa-solid fa-file-import" })
        actions.push({ id: CompendiumAssetAction.CREATE_ARTICLE, name: (game as Game).i18n.localize("MOU.action_create_article"), icon: "fa-solid fa-book-open" })
        actions.push({ id: CompendiumAssetAction.VIEW, small: true, name: (game as Game).i18n.localize("MOU.action_view"), icon: "fa-solid fa-eye" })
        break; 
      case MouCollectionAssetTypeEnum.Item:
      case MouCollectionAssetTypeEnum.Actor:
        actions.push({ id: CompendiumAssetAction.DRAG, drag: true, name: (game as Game).i18n.format("MOU.action_drag", { type: assetType}), icon: "fa-solid fa-hand" })
        actions.push({ id: CompendiumAssetAction.IMPORT, name: (game as Game).i18n.format("MOU.action_import", { type: assetType}), icon: "fa-solid fa-file-import" })
        actions.push({ id: CompendiumAssetAction.CREATE_ARTICLE, name: (game as Game).i18n.localize("MOU.action_create_article"), icon: "fa-solid fa-book-open" })
        actions.push({ id: CompendiumAssetAction.VIEW, small: true, name: (game as Game).i18n.localize("MOU.action_view"), icon: "fa-solid fa-eye" })
        break;    
      case MouCollectionAssetTypeEnum.JournalEntry:
      case MouCollectionAssetTypeEnum.Macro:
        actions.push({ id: CompendiumAssetAction.DRAG, drag: true, name: (game as Game).i18n.format("MOU.action_drag", { type: assetType}), icon: "fa-solid fa-hand" })
        actions.push({ id: CompendiumAssetAction.IMPORT, name: (game as Game).i18n.format("MOU.action_import", { type: assetType}), icon: "fa-solid fa-file-import" })
        actions.push({ id: CompendiumAssetAction.VIEW, small: true, name: (game as Game).i18n.localize("MOU.action_view"), icon: "fa-solid fa-eye" })
        break
      case MouCollectionAssetTypeEnum.Image:
        actions.push({ id: CompendiumAssetAction.CREATE_ARTICLE, name: (game as Game).i18n.localize("MOU.action_create_article"), icon: "fa-solid fa-book-open" })
        break;    
      case MouCollectionAssetTypeEnum.PDF:
        actions.push({ id: CompendiumAssetAction.CREATE_ARTICLE, name: (game as Game).i18n.localize("MOU.action_create_article"), icon: "fa-solid fa-book-open" })
        break;    
      case MouCollectionAssetTypeEnum.Audio:
        actions.push({ id: CompendiumAssetAction.IMPORT, name: (game as Game).i18n.localize("MOU.action_audio_play"), icon: "fa-solid fa-play-pause" })
        if(asset.flags.hasAudioPreview) {
          actions.push({ id: CompendiumAssetAction.PREVIEW, name: (game as Game).i18n.localize("MOU.action_preview"), icon: "fa-solid fa-headphones" })
        }
        break;    
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
          case MouCollectionAssetTypeEnum.Audio: return { name: action.name, description: (game as Game).i18n.localize("MOU.action_hint_drag_audio") }
          case MouCollectionAssetTypeEnum.Macro: return { name: action.name, description: (game as Game).i18n.localize("MOU.action_hint_drag_macro") }
        }
        break
      case CompendiumAssetAction.IMPORT:
        switch(asset.type) {
          case MouCollectionAssetTypeEnum.Map: return { name: action.name, description: (game as Game).i18n.localize("MOU.action_hint_import_image") }
          case MouCollectionAssetTypeEnum.Scene: return { name: action.name, description: (game as Game).i18n.localize("MOU.action_hint_import_asset") }
          case MouCollectionAssetTypeEnum.Item: return { name: action.name, description: (game as Game).i18n.localize("MOU.action_hint_import_asset") }
          case MouCollectionAssetTypeEnum.Actor: return { name: action.name, description: (game as Game).i18n.localize("MOU.action_hint_import_asset") }
          case MouCollectionAssetTypeEnum.Image: return { name: action.name, description: (game as Game).i18n.localize("MOU.action_hint_import_image") }
          case MouCollectionAssetTypeEnum.Audio: return { name: action.name, description: (game as Game).i18n.localize("MOU.action_hint_import_audio") }
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
        MouMediaUtils.copyToClipboard(asset.preview)
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
        const pack = (game as Game).packs.get(asset.pack_id)
        const collection = (game as Game).collections.get(MouCollectionAssetTypeEnum[asset.type]);
        if(pack && collection && id) {  
          const document = await collection.importFromCompendium(pack, id, {}, { renderSheet: true})
          const folder = await MouFoundryUtils.getOrCreateFolder(MouCollectionAssetTypeEnum[asset.type] as foundry.CONST.FOLDER_DOCUMENT_TYPES, folderPath)
          // move entity into right folder
          if(document && folder) {
            // @ts-ignore
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
          case MouCollectionAssetTypeEnum.Image: 
            MouFoundryUtils.createJournalImage(asset.preview, folderPath);
            break
        }
        break
    }
  }

  async fromDropData(assetId: string, data: MouCollectionDragData): Promise<void> {
    data.uuid = assetId
  }

  isConfigurable(): boolean {
    return false;
  }

  configure(callback: Function): void {
    if(callback) {
      return callback()
    }
  }


  
}
