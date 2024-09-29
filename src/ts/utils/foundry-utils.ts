import MouApplication from "../apps/application";
import MouConfig, { MODULE_ID, SETTINGS_USE_FOLDERS } from "../constants";
import { AnyDict } from "../types";
import MouMediaUtils from "./media-utils";

export default class MouFoundryUtils {

  static FOLDER_MAX_LEVELS = 3
  static AUDIO_DEFAULT_RADIUS = 10

  
  /**
   * Retrieves the thumbnail image for a given entry based on its type.
   *
   * @param entry - The entry object containing image data.
   * @param type - The type of the entry (e.g., "Scene").
   * @returns The thumbnail image URL if the type is "Scene", otherwise the main image URL.
   */
  static getThumbnail(entry: AnyDict, type: string) {
    if(type == "Scene") {
      return entry.thumb
    }
    return entry.img
  }

  /**
   * Tries to retrieve image path for the provided FVTT entity
   */
  static getImagePathFromEntity(entity: AnyDict): string | null {
    if("img" in entity && entity.img && entity.img.length > 0) {
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
  static async createJournalImageOrVideo(path: string, folder: string, renderSheet = true) {
    if (!(game as Game).user?.isGM) return null;
    const articleName = MouMediaUtils.prettyMediaName(path)
    const folderObj = await MouFoundryUtils.getOrCreateFolder("JournalEntry", folder)
    let json_text
    // get extension from path 
    const ext = path.split('.').pop() || "unknown"
    console.log(ext)
    if(MouConfig.MEDIA_VIDEOS.includes(ext)) {
      json_text = await renderTemplate(`modules/${MODULE_ID}/templates/json/note-video.hbs`, { path: path, folder: folderObj ? `"${folderObj.id}"` : "null", name: articleName })
    }
    else if(MouConfig.MEDIA_IMAGES.includes(ext)) {
      json_text = await renderTemplate(`modules/${MODULE_ID}/templates/json/note-image.hbs`, { path: path, folder: folderObj ? `"${folderObj.id}"` : "null", name: articleName })
    } else {
      return ui.notifications?.error((game as Game).i18n.format("MOU.error_create_journal_format"))
    }
    const entry = await JournalEntry.create(JSON.parse(json_text))
    if(renderSheet) {
      entry?.sheet?.render(true)
    }
    ui.journal?.activate()
    return entry
  }

  /**
   * Create a journal article with a single page for an entity (scene, actor, etc.)
   */
  static async createJournalImageFromEntity(entity: AnyDict, folder: string) {
    if (!(game as Game).user?.isGM) return;
    const path = MouFoundryUtils.getImagePathFromEntity(entity)
    if(path) {
      await MouFoundryUtils.createJournalImageOrVideo(path, folder, true)
    } else {
      ui.notifications?.error((game as Game).i18n.localize("MOU.error_create_journal_path"))
    }
  }

  /**
   * Create a journal article with a single page for a PDF
   */
  static async createJournalPDF(path: string, folder: string) {
    if (!(game as Game).user?.isGM) return;
    const articleName = MouMediaUtils.prettyMediaName(path)
    const folderObj = await MouFoundryUtils.getOrCreateFolder("JournalEntry", folder)
    const json_text = await renderTemplate(`modules/${MODULE_ID}/templates/json/note-pdf.hbs`, { path: path, folder: folderObj ? `"${folderObj.id}"` : "null", name: articleName })
    const entry = await JournalEntry.create(JSON.parse(json_text))
    entry?.sheet?.render(true)
    ui.journal?.activate()
  }

  /**
   * Creates a new scene from a map image (provided as path)
   */
  static async importSceneFromMap(path: string, folder: string) {
    if (!(game as Game).user?.isGM) return;
    const sceneName = MouMediaUtils.prettyMediaName(path)
    const json_text = await renderTemplate(`modules/${MODULE_ID}/templates/json/scene.hbs`, { path: path, name: sceneName })
    await MouFoundryUtils.importScene(JSON.parse(json_text), folder)
  }

  /**
   * Creates a new scene from the given data
   */
  static async importScene(sceneData: AnyDict, folder:string) {
    if (!(game as Game).user?.isGM) return;
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
    if (!(game as Game).user?.isGM) return;
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
    if (!(game as Game).user?.isGM) return;
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

  /**
   * Imports the audio and plays or stops it
   */
  static async playStopSound(path: string, playlistName:string) {
    if (!(game as Game).user?.isGM) return;
    const volume = 1.0 //audio.volume ? Number(audio.volume) : 1.0
      
    // get playlist
    let playlist = (game as Game).playlists?.find( pl => pl.name == playlistName)
    if(!playlist) {
      playlist = await Playlist.create({name: playlistName, mode: -1})
    }
    if(!playlist) return
    // get sound
    let sound = playlist.sounds.find( s => s.path == MouMediaUtils.getCleanURI(path))
    if(!sound) {
      const name = MouMediaUtils.prettyMediaName(path)
      const soundData = (await playlist.createEmbeddedDocuments("PlaylistSound", [{name: name, path: path, volume: volume}], {}))[0]
      playlist.updateEmbeddedDocuments("PlaylistSound", [{_id: soundData.id, playing: true, volume: volume }]);
    } else {
      playlist.updateEmbeddedDocuments("PlaylistSound", [{_id: sound.id, playing: !sound.playing, volume: volume }]);
    }    
  }


  /**
   * Creates a tile on the scene based on the provided image (path) and position
   */
  static async createTile(canvas: Canvas, imgPath: string, point: { x: number, y: number }): Promise<boolean> {
    const layerTiles = canvas.layers.find(l => l.name == "TilesLayer")
    const layerMou = canvas.layers.find(l => l.name == "MouLayer")

    if(!canvas.dimensions || !layerTiles || !layerMou) return false
    // Determine the tile size
    const data = {} as AnyDict
    const tex = await loadTexture(imgPath);
    if(!tex) return false
    const ratio = canvas.dimensions.size / canvas.dimensions.size;
    data.width = tex.baseTexture.width * ratio;
    data.height = tex.baseTexture.height * ratio;
    data.texture = { src: imgPath }

    // Validate that the drop position is in-bounds and snap to grid
    if ( !canvas.dimensions.rect.contains(point.x, point.y) ) return false;
    data.x = point.x - (data.width / 2);
    data.y = point.y - (data.height / 2);
    //if ( !event.shiftKey ) mergeObject(data, canvas.grid.getSnappedPosition(data.x, data.y));

    // make sure to always put tiles on top
    let maxZ = 0
    // @ts-ignore
    canvas.tiles.placeables.forEach( t => {
      if(t.document.sort > maxZ) maxZ = t.document.sort
    })
    data.z = maxZ

    // Create the tile as hidden if the ALT key is pressed
    //if ( event.altKey ) data.hidden = true;

    // Create the Tile
    let tile : AnyDict;
    // @ts-ignore
    data.overhead = ui.controls.controls.find(c => c.layer === "tiles").foreground ?? false;
    // @ts-ignore
    tile = (await canvas.scene.createEmbeddedDocuments(Tile.embeddedName, [data], { parent: canvas.scene }))[0]
    tile = tile._object
    tile.control() // automatically select dropped tile

    // @ts-ignore
    if(!layerTiles.active && !layerMou.active) {
      layerTiles.activate()
    }
    return true
  }

  /**
   * Creates a note on the scene based on the provided image (path) and position
   */
  static async createNoteImage(canvas: Canvas, folder: string, imgPath: string, point: { x: number, y: number }): Promise<boolean> {
    const layerNotes = canvas.layers.find(l => l.name == "NotesLayer")
    const layerMou = canvas.layers.find(l => l.name == "MouLayer")
    
    if(!canvas.dimensions || !canvas.grid || !layerNotes || !layerMou) return false

    // generate journal
    const entry = await MouFoundryUtils.createJournalImageOrVideo(imgPath, folder, false)
    if(!entry) return false
    // @ts-ignore
    const coord = canvas.grid.getSnappedPoint({x: point.x - canvas.grid.sizeX/2, y: point.y - canvas.grid.sizeY/2}, {mode: CONST.GRID_SNAPPING_MODES.VERTEX})
    // Default Note data
    const noteData = {
      entryId: entry.id,
      // @ts-ignore
      x: coord.x + canvas.grid.sizeX/2,
      // @ts-ignore
      y: coord.y + canvas.grid.sizeY/2,
      iconSize: 40,
      textAnchor: CONST.TEXT_ANCHOR_POINTS.BOTTOM,
      fontSize: 48,
      fontFamily: CONFIG.defaultFontFamily
    };

    // Create a NoteConfig sheet instance to finalize the creation
    // @ts-ignore
    let note = (await canvas.scene.createEmbeddedDocuments(Note.embeddedName, [noteData], { parent: canvas.scene }))[0]
    // @ts-ignore
    note = note._object
    // @ts-ignore
    if(!layerNotes.active && !layerMou.active) {
      layerNotes.activate()
    }

    // @ts-ignore
    note.sheet.render(true);

    return true
  }


  /**
   * Creates an ambient sound on the scene based on the provided audio (path) and position
   */
  static async createAmbientAudio(canvas: Canvas, sndPath: string, point: { x: number, y: number }): Promise<boolean> {
    const layerSounds = canvas.layers.find(l => l.name == "SoundsLayer")
    const layerMou = canvas.layers.find(l => l.name == "MouLayer")
    
    if(!canvas.dimensions || !canvas.grid || !layerSounds || !layerMou) return false
    
    // Validate that the drop position is in-bounds and snap to grid
    if ( !canvas.dimensions.rect.contains(point.x, point.y) ) return false;
    
    const soundData = {
      t: "l",
      x: point.x,
      y: point.y,
      path: sndPath,
      radius: MouFoundryUtils.AUDIO_DEFAULT_RADIUS,
      repeat: true,
      volume: 1
    }
    // @ts-ignore
    const sound = (await canvas.scene.createEmbeddedDocuments("AmbientSound", [soundData], { parent: canvas.scene }))[0]
    layerSounds.activate();
    // @ts-ignore
    sound.sheet.render(true)
    return true
  }

  /**
   * Extract value from object
   */
  static getValueFromObject(object: AnyDict, path: string): any {
    // remove initial "." if any
    if(path.startsWith(".")) {
      path = path.substring(1)
    }
    // dummy use case
    if(!path || path.length == 0) {
      return object
    }
    // regular expression for match .*[key==value].*
    const regex = /\[[^\=]+\=\=[^\]]+\]/g; 
    const match = regex.exec(path);
    if(match) {
      // retrieve list
      const listPath = path.substring(0, match.index)
      const list = foundry.utils.getProperty(object, listPath)
      if(list) {
        // find matching element in list
        const keyVal = match[0].substring(1,match[0].length-1).split("==")
        const found = list.find((el: AnyDict) => el[keyVal[0]] == keyVal[1])
        if(found) {
          // find value
          return MouFoundryUtils.getValueFromObject(found, path.substring(match.index + match[0].length))
        }
      }
    }
    // count
    else if(path.startsWith("#")) {
      const value = foundry.utils.getProperty(object, path.substring(1))
      return value ? value.size : 0
    }
    else {
      return foundry.utils.getProperty(object, path)
    }
    return null
  }

}