import { MODULE_ID } from "../constants";
import { MouModule } from "../types";

/**
 * This class handles events (like drag & drop)
 */
export default class MouEventHandler {

  async handleDragAndDrop(data: any): Promise<void> {
    if("moulinette" in data && "collection" in data.moulinette) {
      const module = (game as Game).modules.get(MODULE_ID) as MouModule
      const collection = module.collections.find(c => c.getId() == data.moulinette.collection)
      await collection?.fromDropData(data.moulinette.asset, data)
    }
  }

}