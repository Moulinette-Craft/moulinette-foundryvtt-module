import MouApplication from "../apps/application";
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

};
