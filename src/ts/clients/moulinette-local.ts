import MouApplication from "../apps/application";
import { MoulinetteProgress } from "../apps/progressbar";
import { CollectionCompendiumsUtils } from "../collections/config/collection-compendiums-utils";
import MouConfig, { SETTINGS_COLLECTION_LOCAL } from "../constants";
import { AnyDict } from "../types";
import MouFileManager from "../utils/file-manager";
import MouFoundryUtils from "../utils/foundry-utils";
import MouMediaUtils from "../utils/media-utils";

export default class MouLocalClient {

  static APP_NAME = "MouLocalClient"
  static INDEX_COMPENDIUMS = "index-compendiums.json"
  static INDEX_LOCAL_ASSETS = "index-localassets.json"

  /**
   * Recursively build the folder path
   */
  static generateFoldersPath(folder: AnyDict): string {
    if(!folder) return ""
    return MouLocalClient.generateFoldersPath(folder.folder) + folder.name + "/"
  }


  /**
   * Indexes all active compendiums in the world.
   * 
   * @param {boolean} [reindex=false] - If true, forces re-indexing of all compendiums even if they are already indexed.
   * @returns {Promise<{packs: any[], assets: any[]}>} - An object containing the indexed packs and assets.
   * 
   * @remarks
   * This function reads all active compendiums in the world and indexes their contents. It supports reusing existing index 
   * data if the compendium version has not changed, unless reindexing is forced. The function also handles different types 
   * of compendiums (system, module, world) and applies exclusions based on user settings. Indices are kept in a file 
   * {MOU_DEF_FOLDER}/index-compendiums.json.
   * 
   * @throws Will log a warning if unable to fetch documents from a compendium.
   */
  static async indexAllCompendiums(reindex = false) {

    MouApplication.logInfo(MouLocalClient.APP_NAME, "Indexing all active compendiums in world...")
    const _game = game as Game

    const indexPath = `${MouConfig.MOU_DEF_FOLDER}/${MouLocalClient.INDEX_COMPENDIUMS}`
    let indexData = await MouFileManager.loadJSON(indexPath)
    
    // read all compendiums 
    let updated = false
    const assetsPacks = []
    const assets = []
    let idx = 0
    let processed = 0
    
    const progressbar = (new MoulinetteProgress((game as Game).i18n.localize("MOU.index_compendiums")))
    progressbar.render(true)

    for(const p of _game.packs as any) {
      progressbar.setProgress(Math.round((idx / (game as Game).packs.size)*100), (game as Game).i18n.format("MOU.indexing", { count: processed++ }))
    
      if(!p.testUserPermission(_game.user, "OBSERVER")) {
        continue;
      }
      
      let packId = p.metadata.id
      if(packId.startsWith("world.moulinette")) {
        continue;
      }

      let version = null
      // retrieve creator/publisher
      let creatorName = "??"
      // compendium from system => creator = name of the system
      if(p.metadata.packageType == "system") {
        version = (_game.system as AnyDict).version
        creatorName = (_game.system as AnyDict).title
      }
      // compendium from module => creator = title of the module
      else if(p.metadata.packageType == "module") {
        const module = _game.modules.get(p.metadata.packageName) as AnyDict
        creatorName = module.title
        version = module.version
      }
      // compendium from world => creator = title of the world
      else if(p.metadata.packageType == "world") {
        creatorName = (_game.world as AnyDict).title
        packId = (_game.world as AnyDict).id + "." + packId // distinguish two same packs in different worlds
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
        packId: p.metadata.id,
        publisher: creatorName,
        name: p.metadata.label,
        type: p.metadata.type,
        path: "",
        count: elements.length,
        idx: 0
      }

      // store in index (if not local)
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

      // retrieve all folders to build path
      const folder = MouLocalClient.generateFoldersPath(p.folder)

      // read all assets
      for(const el of elements) {
        const asset = { 
          id: el.uuid,
          img : MouFoundryUtils.getThumbnail(el, packData.type),
          filename: folder, // use for folder path
          name: el.name,
          data: {
            type: packData.type,
            system: _game.system.id,
            meta: CollectionCompendiumsUtils.generateMetaFromLocal(el, packData.type)
          },
          pack: 0
        }
        // store in index (except local)
        if(p.metadata.packageType != "world") {
          indexData[packId].assets.push(foundry.utils.duplicate(asset))
        }
        asset.pack = idx
        assets.push(asset)
      }

      idx++;
    }

    progressbar.setProgress(100, (game as Game).i18n.format("MOU.indexing", { count: processed++ }))
    setTimeout(() => progressbar.close(), 1000);

    // store index if updated
    if(updated) {
      await MouFileManager.storeJSON(indexData, MouLocalClient.INDEX_COMPENDIUMS, MouConfig.MOU_DEF_FOLDER);
    }

    // apply exclusions
    const curExclusions = MouApplication.getSettings("dataExclusions") as AnyDict
    const filteredPacks = assetsPacks.filter((p) => !(p.publisher in curExclusions && ('*' in curExclusions[p.publisher] || p.name in curExclusions[p.publisher])))
    return { packs: filteredPacks, assets: assets }
  }


  /**
   * Indexes all local assets in the specified path and updates the index data.
   * 
   * @param path - The path to the folder containing the assets.
   * @param source - The source type for the FilePicker.
   * @param callbackOnComplete - Optional callback function to be called upon completion.
   * @param options - Optional settings for indexing:
   *   - metadata: Whether to retrieve metadata for the assets.
   *   - thumbs: Whether to generate thumbnails for image assets.
   * @param force - Whether to force re-indexing of assets, ignoring old data.
   * @returns A promise that resolves when the indexing is complete.
   */
  static async indexAllLocalAssets(path: string, source: string, callbackOnComplete?: Function, options?: { metadata: boolean, thumbs: boolean }, force: boolean = false): Promise<void> {
    const indexPath = `${MouConfig.MOU_DEF_FOLDER}/${MouLocalClient.INDEX_LOCAL_ASSETS}`
    let indexData = await MouFileManager.loadJSON(indexPath)
    const indexFolder = `${path}#${source}`
    if(!(indexFolder in indexData)) indexData[indexFolder] = []
    const oldAssets = force ? [] : indexData[indexFolder]
    const assets = indexData[indexFolder] = [] as AnyDict

    const module = MouApplication.getModule()
    const progressbar = (new MoulinetteProgress((game as Game).i18n.localize("MOU.index_folders"), 1, (game as Game).i18n.format("MOU.index_folders_list", { path })))
    progressbar.render(true)
    
    try {
      const files = await MouFileManager.scanFolder(source as FilePicker.SourceType, path, module.debug)
      
      let i = 0;
      let assetsCount = 0;
      (async function loop() {
        try {
          while(true) {
            const srcUrl = files[i]
            const fileURL = MouMediaUtils.getCleanURI(files[i])
            const ext = fileURL.split(".").pop()?.toLocaleLowerCase() as string
            const fileData = { path: fileURL } as AnyDict
            if(MouConfig.MEDIA_IMAGES.includes(ext) || MouConfig.MEDIA_VIDEOS.includes(ext)) {
              assetsCount++
              // generating image thumbnails
              if(options && options.thumbs) {
                const paths = await MouFileManager.getMediaPaths(fileURL, source)
                const thumbFilename = paths.filename.substring(0, paths.filename.lastIndexOf(".")) + ".webp"
                // don't generate thumbnail for SVG
                if(ext != "svg") {
                  const generated = await MouFileManager.generateThumbnail(srcUrl, thumbFilename, `${MouConfig.MOU_DEF_THUMBS}/${paths.folder}`)
                  if(generated && module.debug) {
                    MouApplication.logDebug(MouLocalClient.APP_NAME, `Thumbnail generated for ${fileURL}`)
                  }
                }
              }
              // retrieving metadata for images (ie width & height)
              if(options && options?.metadata) {
                const existing = oldAssets.find((a: AnyDict) => a.path = fileURL)
                if(existing && existing.width && existing.height) {
                  fileData.width = existing.width
                  fileData.height = existing.height
                }
                else {
                  const meta = await MouMediaUtils.getMetadataFromMedia(srcUrl)
                  if(meta) {
                    fileData.width = meta.width
                    fileData.height = meta.height
                  }
                }
              }
              assets.push(fileData)
            } else if (MouConfig.MEDIA_AUDIO.includes(ext)) {
              assetsCount++

              // retrieving metadata for audio (ie sound duration)
              if(options && options?.metadata) {
                const existing = oldAssets.find((a: AnyDict) => a.path = fileURL)
                if(existing && existing.duration) {
                  fileData.duration = existing.duration
                } else {
                  const meta = await MouMediaUtils.getMetadataFromAudio(srcUrl)
                  if(meta) {
                    fileData.duration = meta.duration
                  }
                }
              }
              assets.push(fileData)
            }
            else if (MouConfig.MEDIA_OTHER.includes(ext)) {
              assetsCount++
              assets.push(fileData)
            }
            i++;
            if (i >= files.length) break
            if (i % MouConfig.FILEMANAGER_LOOP_UPDATE == 0) {
              const message = (game as Game).i18n.format("MOU.index_folders_assets", { 
                index: MouMediaUtils.prettyNumber(i, true), 
                count: MouMediaUtils.prettyNumber(files.length, true) 
              })
              progressbar.setProgress(100*i/files.length, message)
              break
            }
          }
          if (i < files.length) {
            setTimeout(await loop, 0);
          } else {
            progressbar.setProgress(100)
            await progressbar.close()
            await MouFileManager.storeJSON(indexData, MouLocalClient.INDEX_LOCAL_ASSETS, MouConfig.MOU_DEF_FOLDER)
            if(callbackOnComplete) {
              await callbackOnComplete(path, source, assetsCount)
            }
          }
        } catch(error: any) {
          ui.notifications?.warn((game as Game).i18n.localize("MOU.error_folder_indexing_failed"))
          MouApplication.logError(MouLocalClient.APP_NAME, "Folder indexing failed", error)
          MouFileManager.storeJSON(indexData, MouLocalClient.INDEX_LOCAL_ASSETS, MouConfig.MOU_DEF_FOLDER)
          await progressbar.close()
        }
      })();
     
    } catch(error: any) {
      ui.notifications?.warn((game as Game).i18n.localize("MOU.error_folder_indexing_failed"))
      MouApplication.logError(MouLocalClient.APP_NAME, "Folder indexing failed", error)
      await progressbar.close()
    }    
  }


  /**
   * Retrieves all packs from the local settings.
   *
   * @returns {Promise<{name: string, path: string}[]>} A promise that resolves to an array of objects,
   * each containing the name and path of a pack.
   */
  static async getAllPacks(): Promise<{name: string, path: string}[]> {
    const settings = MouApplication.getSettings(SETTINGS_COLLECTION_LOCAL) as AnyDict
    return settings.folders.map((f : AnyDict) => { return { name: f.name, path: f.path } })
  }


  /**
   * Retrieves all assets from the local settings and index data.
   *
   * @returns {Promise<AnyDict>} A promise that resolves to a dictionary of assets.
   *
   * The returned dictionary contains asset information indexed by folder paths and sources.
   * Each entry includes the folder name, the assets within the folder, and any additional options.
   */
  static async getAllAssets(): Promise<AnyDict> {
    const assets = {} as AnyDict
    const settings = MouApplication.getSettings(SETTINGS_COLLECTION_LOCAL) as AnyDict
    const indexPath = `${MouConfig.MOU_DEF_FOLDER}/${MouLocalClient.INDEX_LOCAL_ASSETS}`
    let indexData = await MouFileManager.loadJSON(indexPath)
    for(const folder of settings.folders) {
      const folderIdx = `${folder.path}#${folder.source}`
      if(folderIdx in indexData) {
        assets[folderIdx] = {
          id: folderIdx,
          name: folder.name,
          assets: indexData[folderIdx],
          options: folder.options
        } 
      }
    }
    return assets
  }
  
}