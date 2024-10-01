import MouApplication from "./application";

/**
 * This class handles events (like drag & drop)
 */
export default class MouEventHandler {

  async handleDragAndDrop(data: any): Promise<void> {
    if("moulinette" in data && "collection" in data.moulinette) {
      const module = MouApplication.getModule()
      const collection = module.collections.find(c => c.getId() == data.moulinette.collection)
      await collection?.fromDropData(data.moulinette.asset, data)
    }
  }

}