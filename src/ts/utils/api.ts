import MouApplication from "../apps/application";
import { MouCollectionAssetTypeEnum } from "../apps/collection";
import { SETTINGS_HIDDEN } from "../constants";
import { AnyDict } from "../types";


export class MouAPI {

  static APP_NAME = "Moulinette API";
  
  /**
   * Open Moulinette UI and triggers a search
   * - collection : which collection to use (e.g. "tiles", "scenes", "sounds")
   * - type: which type of asset to search for (e.g. "image", "video", "audio")
   * - search:
   *    - terms : search terms (filter)
   *    - creator : filter the pack list based on the creator name (must exactly match)
   *    - pack : filter the pack list based on the pack name (partial name (prefix) works too)
   */
  static searchUI(collection: string, type: string, search: AnyDict = {}) {
    console.log(`${this.APP_NAME} | Opening search UI for collection: ${collection}, type: ${type}`, search);
    MouApplication.getModule().browser.search(collection, type, search);
  }

  static async searchAssets(terms: string, type: MouCollectionAssetTypeEnum) {
    if([MouCollectionAssetTypeEnum.Image, MouCollectionAssetTypeEnum.Audio, MouCollectionAssetTypeEnum.Map].includes(type) === false) {
      throw new Error("Unsupported asset type for searchAll");
    }
    // list of all supported collections and types for the searchAll
    //const supportedColl = ["mou-cloud-cached", "mou-local", "mou-gameicons", "mou-bbc-sounds"];
    const supportedColl = ["mou-local", "mou-gameicons", "mou-bbc-sounds"];
    // retrieve all enabled collections
    const module = MouApplication.getModule()
    const disabled = MouApplication.getSettings(SETTINGS_HIDDEN) as AnyDict
    const collections = module.collections.filter( col => { 
      return supportedColl.includes(col.getId()) && col.supportsType(type) && !disabled[col.getId()]
    })
    // initialize all collections
    await Promise.all(
      collections.map((collection) => collection.initialize())
    )
    // perform search on each collection
    const result = await Promise.all(
      collections.map(async (collection) => {
      const searchResult = await collection.searchAssets({ searchTerms: terms, type }, 0);
      return {
        ...searchResult,
        collection: collection.getId(), // Add collection ID to each result
      };
      }),
    );
    return {
      assets: result.map((item) => 
      item.assets.map((asset) => ({ ...asset, collection: item.collection }))).flat(),
      types: result.map((item) => item.types).flat(),
      creators: result.map((item) => item.creators).flat(),
      packs: result.map((item) => item.packs).flat(),
    }
  }
};
