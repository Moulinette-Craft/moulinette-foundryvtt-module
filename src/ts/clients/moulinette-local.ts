import MouApplication from "../apps/application";
import { MoulinetteProgress } from "../apps/progressbar";
import { MEDIA_AUDIO, MEDIA_IMAGES, MEDIA_VIDEOS, MODULE_ID, MOU_DEF_FOLDER, SETTINGS_COLLECTION_LOCAL } from "../constants";
import { AnyDict, MouModule } from "../types";
import MouFileManager from "../utils/file-manager";

export default class MouLocalClient {

  static APP_NAME = "MouLocalClient"
  static INDEX_COMPENDIUMS = "index-compendiums.json"
  static INDEX_LOCAL_ASSETS = "index-localassets.json"

  /**
   * Returns a thumbnail for this entry (from compendium)
   */
  static getThumbnail(entry: AnyDict, type: string) {
    if(type == "Scene") {
      return entry.thumb
    }
    return entry.img
  }

  /**
   * Recursively build the folder path
   */
  static generateFoldersPath(folder: AnyDict): string {
    if(!folder) return ""
    return MouLocalClient.generateFoldersPath(folder.folder) + folder.name + "/"
  }

  /**
   * This function browses all compendiums and index all the content
   * - Indices are kept in a file {MOU_DEF_FOLDER}/index-compendiums.json
   * - Automatically updates indices of existing compendiums for which the version doesn't match
   * - Index is shared among all worlds of the installation
   * Returns the index based on enabled compendiums
   */
  static async indexAllCompendiums(reindex = false) {

    MouApplication.logInfo(MouLocalClient.APP_NAME, "Indexing all active compendiums in world...")
    const _game = game as Game

    const indexPath = `${MOU_DEF_FOLDER}/${MouLocalClient.INDEX_COMPENDIUMS}`
    let indexData = await MouFileManager.loadJSON(indexPath)
    
    // read all compendiums 
    let updated = false
    const assetsPacks = []
    const assets = []
    let idx = 0
    let processed = 0
    
    console.log("HERE")
    const progressbar = (new MoulinetteProgress((game as Game).i18n.localize("MOU.index_compendiums")))
    progressbar.render(true)

    for(const p of _game.packs) {
      progressbar.setProgress(Math.round((idx / (game as Game).packs.size)*100), (game as Game).i18n.format("MOU.indexing", { count: processed++ }))
    
      // @ts-ignore check permission 
      if(!p.testUserPermission(_game.user, "OBSERVER")) {
        continue;
      }
      
      // @ts-ignore
      let packId = p.metadata.id
      if(packId.startsWith("world.moulinette")) {
        continue;
      }

      let version = null
      // retrieve creator/publisher
      let creatorName = "??"
      // @ts-ignore compendium from system => creator = name of the system
      if(p.metadata.packageType == "system") {
        // @ts-ignore
        version = _game.system.version
        // @ts-ignore
        creatorName = game.system.title
      }
      // @ts-ignore compendium from module => creator = title of the module
      else if(p.metadata.packageType == "module") {
        // @ts-ignore
        const module = game.modules.get(p.metadata.packageName)
        creatorName = module.title
        version = module.version
      }
      // compendium from world => creator = title of the world
      // @ts-ignore
      else if(p.metadata.packageType == "world") {
        // @ts-ignore
        creatorName = game.world.title
        // @ts-ignore
        packId = game.world.id + "." + packId // distinguish two same packs in different worlds
      }

      // check if already in index data (world compendiums must always re-indexed because they have no version)
      if(!reindex && packId in indexData && version && indexData[packId].version == version) {
        MouApplication.logInfo(MouLocalClient.APP_NAME, `Re-using existing index for ${packId} (v. ${version})... (remove index ${indexPath} to force re-indexing)`)
        // retrieve pack and assets
        const pack = foundry.utils.duplicate(indexData[packId].pack)
        pack.idx = idx,
        assetsPacks.push(pack)
        const indexedAssets = foundry.utils.duplicate(indexData[packId].assets)
        for(const a of indexedAssets) {
          a.pack = idx
          assets.push(a)
        }
        idx++
        continue
      }
      
      let elements
      try {
        elements = await p.getDocuments()
      } catch(Error) {
        MouApplication.logWarn(MouLocalClient.APP_NAME, `Unable to fetch documents from compendium ${p.metadata.label}. Skipping...`)        
        continue
      }

      const packData = {
        // @ts-ignore
        packId: p.metadata.id,
        publisher: creatorName,
        name: p.metadata.label,
        type: p.metadata.type,
        path: "",
        count: elements.length,
        idx: 0
      }

      // store in index (if not local)
      // @ts-ignore
      if(p.metadata.packageType != "world") {
        indexData[packId] = {
          version: version,
          pack: foundry.utils.duplicate(packData),
          assets: []
        }
        updated = true
      }
      packData.idx = idx
      assetsPacks.push(packData)

      // @ts-ignore retrieve all folders to build path
      const folder = MouLocalClient.generateFoldersPath(p.folder)

      // read all assets
      for(const el of elements) {
        /*
        const entry = {
          type: packData.type,
          // @ts-ignore
          system: game.system.id,
          //meta: MouLocalClient.generateMetaFromLocal(el, packData.type)
        }*/
        const asset = { 
          // @ts-ignore
          id: el.uuid,
          img : MouLocalClient.getThumbnail(el, packData.type),
          filename: folder, // use for folder path
          name: el.name,
          //infos: MoulinetteCompendiumsUtil.getAdditionalInfo(el, packData.type)
          //infos: MouLocalClient.getAdditionalInfoFromMeta(entry),
          pack: 0
        }
        // @ts-ignore store in index (if not local)
        if(p.metadata.packageType != "world") {
          indexData[packId].assets.push(foundry.utils.duplicate(asset))
        }
        asset.pack = idx
        assets.push(asset)
      }

      idx++;
    }

    progressbar.setProgress(100, (game as Game).i18n.format("MOU.indexing", { count: processed++ }))

    // store index if updated
    if(updated) {
      await MouFileManager.storeJSON(indexData, MouLocalClient.INDEX_COMPENDIUMS, MOU_DEF_FOLDER);
    }

    console.groupEnd()

    // apply exclusions
    const curExclusions = MouApplication.getSettings("dataExclusions") as AnyDict
    const filteredPacks = assetsPacks.filter((p) => !(p.publisher in curExclusions && ('*' in curExclusions[p.publisher] || p.name in curExclusions[p.publisher])))
    return { packs: filteredPacks, assets: assets }
  }


  static async indexAllLocalAssets(path: string, source: string, reindex = false): Promise<void> {
    console.log(reindex)
    const indexPath = `${MOU_DEF_FOLDER}/${MouLocalClient.INDEX_LOCAL_ASSETS}`
    let indexData = await MouFileManager.loadJSON(indexPath)
    const indexFolder = `${path}#${source}`
    if(!(indexFolder in indexData)) indexData[indexFolder] = []
    const assets = indexData[indexFolder]

    const module = (game as Game).modules.get(MODULE_ID) as MouModule
    const progressbar = (new MoulinetteProgress((game as Game).i18n.localize("MOU.index_folders")))
    progressbar.render(true)
    progressbar.setProgress(1, (game as Game).i18n.format("MOU.index_folders_list", { path }))
    try {
      const files = await MouFileManager.scanFolder(source as FilePicker.SourceType, path, module.debug)
      const images = files.filter(f => MEDIA_IMAGES.includes(f.split(".").pop()?.toLocaleLowerCase() as string))
      const videos = files.filter(f => MEDIA_VIDEOS.includes(f.split(".").pop()?.toLocaleLowerCase() as string))
      const audio = files.filter(f => MEDIA_AUDIO.includes(f.split(".").pop()?.toLocaleLowerCase() as string))

      const totalCount = images.length + videos.length + audio.length
      const imagesMessage = (game as Game).i18n.format("MOU.index_folders_images", { count: images.length })
      let currentCount = 0
      for (let i=0; i<images.length; i++) {
        if(progressbar.wasCancelled()) break
        //const img = await MouFileManager.loadImage(images[i])
        assets.push({ path: images[i] })
        progressbar.setProgress((currentCount+i)/totalCount, imagesMessage)
      }
      currentCount = images.length
      for (let i=0; i<audio.length; i++) {
        if(progressbar.wasCancelled()) break
        assets.push({ path: audio[i] })
        progressbar.setProgress((currentCount+i)/totalCount, imagesMessage)
      }
    } catch(error: any) {
      ui.notifications?.warn((game as Game).i18n.localize("MOU.error_folder_indexing_failed"))
      MouApplication.logError(MouLocalClient.APP_NAME, "Folder indexing failed", error)
    }
    progressbar.setProgress(100)

    await MouFileManager.storeJSON(indexData, MouLocalClient.INDEX_LOCAL_ASSETS, MOU_DEF_FOLDER);
  }


  static async getAllPacks(): Promise<{name: string, path: string}[]> {
    const settings = MouApplication.getSettings(SETTINGS_COLLECTION_LOCAL) as AnyDict
    return settings.folders.map((f : AnyDict) => { return { name: f.name, path: f.path } })
  }

  static async getAllAssets(): Promise<AnyDict> {
    const assets = {} as AnyDict
    const settings = MouApplication.getSettings(SETTINGS_COLLECTION_LOCAL) as AnyDict
    const indexPath = `${MOU_DEF_FOLDER}/${MouLocalClient.INDEX_LOCAL_ASSETS}`
    let indexData = await MouFileManager.loadJSON(indexPath)
    for(const folder of settings.folders) {
      const folderIdx = `${folder.path}#${folder.source}`
      if(folderIdx in indexData) {
        assets[folderIdx] = {
          name: folder.name,
          assets: indexData[folderIdx]
        } 
      }
    }
    return assets
  }
  
}