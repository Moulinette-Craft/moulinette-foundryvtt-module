import MouApplication from "../apps/application";
import { MODULE_ID, SETTINGS_USE_FOLDERS } from "../constants";
import { AnyDict } from "../types";
import MouMediaUtils from "./media-utils";

export default class MouFoundryUtils {

  static FOLDER_MAX_LEVELS = 3

  /**
   * Tries to retrieve image path for the provided FVTT entity
   */
  static getImagePathFromEntity(entity: AnyDict): string | null {
    if("img" in entity && entity.img.length > 0) {
      return entity.img
    } else if("background" in entity && "src" in entity.background && entity.background.src.length > 0) {
      return entity.background.src
    }
    return null
  }

  /**
   * Generates folders (if not exists)
   * Returns the folder entity (last in hierarchy)
   * 
   * @param entityType type of entity (like JournalArticle, Scene, etc.)
   * @param path folder path as string (like Moulinette/creator/pack)
   * @returns 
   */
  static async getOrCreateFolder(entityType: foundry.CONST.FOLDER_DOCUMENT_TYPES, path: string) {
    if(!path || path.length == 0 || !MouApplication.getSettings(SETTINGS_USE_FOLDERS)) return null
    
    const paths = path.split("/")
    // first level
    let folders : Folder[] = (game as Game).folders?.filter( f => f.name == paths[0] && f.type == entityType ) || []
    let curLevel = folders.length == 0 ? await Folder.create({name: paths[0], type: entityType, folder: null}) : folders[0]
    
    for(let lvl = 1; lvl < Math.max(paths.length, MouFoundryUtils.FOLDER_MAX_LEVELS); lvl++ ) {
      folders = curLevel?.getSubfolders() ? curLevel?.getSubfolders().filter( f => f.name == paths[lvl] ) : []
      curLevel = folders.length == 0 ? await Folder.create({name: paths[lvl], type: entityType, folder: curLevel?.id}) : folders[0]
    }
    
    return curLevel
  }

  /**
   * Create a journal article with a single page for an image
   */
  static async createJournalImage(path: string, folder: string) {
    const articleName = MouMediaUtils.prettyMediaName(path)
    const folderObj = await MouFoundryUtils.getOrCreateFolder("JournalEntry", folder)
    const json_text = await renderTemplate(`modules/${MODULE_ID}/templates/json/note-image.hbs`, { path: path, folder: folderObj ? `"${folderObj.id}"` : "null", name: articleName })
    const entry = await JournalEntry.create(JSON.parse(json_text))
    entry?.sheet?.render(true)
  }

  /**
   * Create a journal article with a single page for an entity (scene, actor, etc.)
   */
  static async createJournalImageFromEntity(entity: AnyDict, folder: string) {
    const path = MouFoundryUtils.getImagePathFromEntity(entity)
    if(path) {
      const articleName = MouMediaUtils.prettyMediaName(path)
      const folderObj = await MouFoundryUtils.getOrCreateFolder("JournalEntry", folder)
      let json_text
      if(path.endsWith(".webm") || path.endsWith(".mp4")) {
        json_text = await renderTemplate(`modules/${MODULE_ID}/templates/json/note-video.hbs`, { path: path, folder: folderObj ? `"${folderObj.id}"` : "null", name: articleName })
      }
      else if(path.endsWith(".webp")) {
        json_text = await renderTemplate(`modules/${MODULE_ID}/templates/json/note-image.hbs`, { path: path, folder: folderObj ? `"${folderObj.id}"` : "null", name: articleName })
      } else {
        return ui.notifications?.error((game as Game).i18n.format("MOU.error_create_journal_format"))
      }
      const entry = await JournalEntry.create(JSON.parse(json_text))
      entry?.sheet?.render(true)
    } else {
      ui.notifications?.error((game as Game).i18n.localize("MOU.error_create_journal_path"))
    }
  }

  /**
   * Creates a new scene from a map image (provided as path)
   */
  static async importSceneFromMap(path: string, folder: string) {
    const sceneName = MouMediaUtils.prettyMediaName(path)
    const json_text = await renderTemplate(`modules/${MODULE_ID}/templates/json/scene.hbs`, { path: path, name: sceneName })
    await MouFoundryUtils.importScene(JSON.parse(json_text), folder)
  }

  /**
   * Creates a new scene from the given data
   */
  static async importScene(sceneData: AnyDict, folder:string) {
    let needsDims = !("width" in sceneData)
    delete sceneData._stats // causes sometimes incompatibilites
    // @ts-ignore: https://foundryvtt.com/api/classes/client.Scene.html#fromSource
    const doc = await Scene.fromSource(sceneData)
    const newScene = await Scene.create(doc)
    if(newScene) {
      const folderObj = await MouFoundryUtils.getOrCreateFolder("Scene", folder)
      // @ts-ignore
      let tData = await newScene.createThumbnail({img: newScene["background.src"] ?? newScene.background.src});
      // reset width/height
      let tUpdate = { thumb: tData.thumb, folder: folderObj ? folderObj.id : null } as AnyDict
      if ( needsDims && tData.width && tData.height ) {
        tUpdate.width = tData.width;
        tUpdate.height = tData.height;
      }  
      await newScene.update(tUpdate); // force generating the thumbnail and width/height (if needsDims)
      ui.scenes?.activate()
    }
  }

  /**
   * Creates a new item from the given data
   */
  static async importItem(itemData: AnyDict, folder:string) {
    // @ts-ignore: https://foundryvtt.com/api/classes/client.Item.html#fromSource
    const doc = await Item.fromSource(itemData)
    const newItem = await Item.create(doc)
    if(newItem) {
      const folderObj = await MouFoundryUtils.getOrCreateFolder("Item", folder)
      let tUpdate = { folder: folderObj ? folderObj.id : null } as AnyDict
      await newItem.update(tUpdate);
      ui.items?.activate()
      newItem?.sheet?.render(true)
    }        
  }

  /**
   * Creates a new actor from the given data
   */
  static async importActor(actorData: AnyDict, folder:string) {
    // @ts-ignore: https://foundryvtt.com/api/classes/client.Actor.html#fromSource
    const doc = await Actor.fromSource(actorData)
    const newActor = await Actor.create(doc)
    if(newActor) {
      const folderObj = await MouFoundryUtils.getOrCreateFolder("Actor", folder)
      let tUpdate = { folder: folderObj ? folderObj.id : null } as AnyDict
      await newActor.update(tUpdate);
      ui.actors?.activate()
      newActor?.sheet?.render(true)
    }
              
  }

}