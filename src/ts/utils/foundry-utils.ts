import MouApplication from "../apps/application";
import { MODULE_ID, SETTINGS_USE_FOLDERS } from "../constants";
import MouMediaUtils from "./media-utils";

export default class MouFoundryUtils {

  static FOLDER_MAX_LEVELS = 3

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

}