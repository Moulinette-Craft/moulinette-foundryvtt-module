export enum MouCollectionAssetTypeEnum {
  Scene = 1,
  Map = 2,
  Image = 3,
  PDF = 4,
  Actor = 5,
  Item = 6,
  Audio = 7,
  JournalEntry = 8,
  Playlist = 9,
  Macro = 10
}

export interface MouCollectionAssetType {
  id: MouCollectionAssetTypeEnum
  assetsCount: number
}

export interface MouCollectionAssetMeta {
  icon: string,
  text: string,
  hint: string
}

export interface MouCollectionAsset {
  id: string
  type: number
  format: string
  image: string
  creator: string
  creator_url: string
  pack: string
  pack_id: string
  name: string
  meta: MouCollectionAssetMeta[]
  icons?: {descr: string, icon: string}[]
  background_color: string,
  draggable?: boolean
}

export interface MouCollectionCreator {
  id: string
  name: string
  assetsCount: number
}

export interface MouCollectionPack {
  id: string
  name: string
  assetsCount: number
}

export interface MouCollectionFilters {
  creator?: string,
  pack?: number,
  type?: number
}

export interface MouCollectionAction {
  id: number,
  name: string,
  icon: string,
  small?: boolean,
  drag?: boolean
}

export interface MouCollectionActionHint {
  name: string,
  description: string
}

export interface MouCollectionDragData {
  moulinette: {
    asset: string,
    collection: string
  },
  type: "Actor" | "Item" | "Macro"
  data?: any
}

export interface MouCollection {
  
  /** Returns the collection unique identifier */
  getId(): string;

  /** Returns the collection name */
  getName(): string;
  
  /** Returns the list of types */
  getTypes(filters: MouCollectionFilters): Promise<MouCollectionAssetType[]>
  
  /** Returns the list of creators (for a specific type) or empty list (collection doesn't support creators) */
  getCreators(type: MouCollectionAssetTypeEnum): Promise<MouCollectionCreator[]>

  /** Returns the list of packs (for a specific type and creator) or empty list (collection doesn't support packs) */
  getPacks(type: MouCollectionAssetTypeEnum, creator: string): Promise<MouCollectionPack[]>

  /** Returns random assets from the collection based on filters */
  getAssets(filters: MouCollectionFilters, page: number): Promise<MouCollectionAsset[]>

  /** Returns random assets from the collection based on filters */
  getRandomAssets(filters: MouCollectionFilters): Promise<MouCollectionAsset[]>

  /** Returns the list of available action  */
  getActions(asset: MouCollectionAsset): MouCollectionAction[]

  /** Returns the hint associated to specified action  */
  getActionHint(asset: MouCollectionAsset, actionId: number) : MouCollectionActionHint | null

  /** Executes the action */
  executeAction(actionId: number, assetId: string): Promise<void>

  /** Fills the data from desired asset */
  fromDropData(assetId: string, data: MouCollectionDragData): Promise<void>
}


export class MouCollectionUtils {
  static getTranslatedType(value: number): string {
    const key : string = MouCollectionAssetTypeEnum[value];
    return (game as Game).i18n.localize(`MOU.type_${key.toLowerCase()}`);
  }
}