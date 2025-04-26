import MouApplication from "../apps/application";
import { SETTINGS_S3_BUCKET } from "../constants";
import { AnyDict } from "../types";
import MouMediaUtils from "./media-utils";

declare var ForgeAPI: any;
declare var ForgeVTT: any;
declare var ForgeVTT_FilePicker: any;

export default class MouFileManager {

  static APP_NAME = "MouFileManager"
  static RETRIES = 2

  /** Keeps S3 BaseURL in cache to avoid multiple API calls */
  private static _cachedS3BaseURL = null as string | null;
  
  /** Keeps files from last browsed folder in cache. Indexing processes 1 folder at a time */
  private static _cachedLastFolderFiles = null as { folder: string, files: string[]} | null;

  /**
   * Detects which source to use (depending if server si Forge or local)
   */
  private static getSource(): FilePicker.SourceType {
    let source = "data";
    
    if (typeof ForgeVTT != "undefined" && ForgeVTT.usingTheForge) {
      source = "forgevtt";
    }
    const bucket = MouApplication.getSettings(SETTINGS_S3_BUCKET) as string
    if(bucket && bucket.length > 0 && bucket != "null") {
      source = "s3"
    }
    
    return source as FilePicker.SourceType;
  }

  /**
   * S3 requires some additional options (specifying the bucket)
   */
  private static getOptions(): FilePicker.BrowseOptions {
    let options : FilePicker.BrowseOptions = {}
    const bucket = MouApplication.getSettings(SETTINGS_S3_BUCKET) as string
    if(bucket && bucket.length > 0 && bucket != "null") {
      options.bucket = bucket
    }
    return options;
  }

  /**
   * Returns the base URL of FVTT hosting server
   */
  static async getBaseURL(source? : string): Promise<string | null> {
    const bucket = MouApplication.getSettings(SETTINGS_S3_BUCKET) as string

    // Support for S3
    if((!source || source == "s3") && bucket && bucket.length > 0 && bucket != "null") {
      // check if already in cache
      if(MouFileManager._cachedS3BaseURL) {
        return MouFileManager._cachedS3BaseURL
      }

      let root = await FilePicker.browse(MouFileManager.getSource(), "", MouFileManager.getOptions());
      let baseURL = null
      
      // Workaround - Moulinette requires 1 file to fetch base URL of S3 storage
      if(root.files.length == 0) {
        await FilePicker.upload("s3", "", new File(["Do NOT delete. Required by Moulinette"], "mtte.txt"), MouFileManager.getOptions())
        root = await FilePicker.browse(MouFileManager.getSource(), "", MouFileManager.getOptions());
      }
      if(root.files.length > 0) {
        const file = root.files[0]
        baseURL = file.substring(0, file.lastIndexOf("/") + 1)
        // keep in cache (avoid API call to S3)
        MouFileManager._cachedS3BaseURL = baseURL
      }
      return baseURL
    } 

    // Support for The Forge
    // #40 : Non-host GMs can't use Moulinette for games hosted on The Forge
    // https://github.com/SvenWerlen/moulinette-core/issues/40
    if (typeof ForgeVTT !== "undefined" && ForgeVTT.usingTheForge) {
      if (!source || source == "forgevtt")  {
        const theForgeAssetsLibraryUserPath = ForgeVTT.ASSETS_LIBRARY_URL_PREFIX + (await ForgeAPI.getUserId() || "user");
        return theForgeAssetsLibraryUserPath ? theForgeAssetsLibraryUserPath + "/" : "";
      }
      else if(source == "forge-bazaar") {
        return ForgeVTT.ASSETS_LIBRARY_URL_PREFIX + "bazaar/assets/"
      }
    }

    return null;
  }

  /**
   * Creates folders recursively (much better than previous)
   */
  static async createFolderRecursive(path: string) {
    const source = MouFileManager.getSource()
    // folder don't have to be created on S3 (automatically handled by S3 provider)
    if(source == "s3") return
    
    const folders = path.split("/")
    let curFolder = ""
    for( const f of folders ) {
      if(f.length == 0) continue
      const parentFolder = await FilePicker.browse(source, curFolder, MouFileManager.getOptions());
      curFolder += (curFolder.length > 0 ? "/" : "" ) + f
      const dirs = parentFolder.dirs.map(d => MouMediaUtils.getCleanURI(d))
      if (!dirs.includes(MouMediaUtils.getCleanURI(curFolder))) {
        try {
          MouApplication.logInfo(MouFileManager.APP_NAME, `Create folder ${curFolder}`)
          await FilePicker.createDirectory(source, curFolder, MouFileManager.getOptions());
        } catch(exc) {
          MouApplication.logError(MouFileManager.APP_NAME, `Not able to create ${curFolder}`, exc)
        }
      }
    }
  }

  /**
   * Uploads a file into the right folder (improved version)
   */
  static async uploadFile(file: File, filename: string, folderPath: string, overwrite = false): Promise<FilePicker.UploadResult | false> {
    const source = MouFileManager.getSource()
    await MouFileManager.createFolderRecursive(folderPath)
    
    // check if file already exist
    //const baseURL = await MoulinetteFileUtil.getBaseURL();
    let base = await FilePicker.browse(source, folderPath, MouFileManager.getOptions());
    let exist = base.files.filter(f => MouMediaUtils.getCleanURI(f) == `${folderPath}/${filename}`)
    //if(exist.length > 0 && !overwrite) return { path: `${baseURL}${folderPath}/${filename}` };
    if(exist.length > 0 && !overwrite) {
      MouApplication.logInfo(MouFileManager.APP_NAME, `File ${folderPath}/${filename} already exists. Upoad skipped!`)
      return { status: "success", path: `${folderPath}/${filename}`, message: "File already exists" };
    }
    
    try {
      if (typeof ForgeVTT != "undefined" && ForgeVTT.usingTheForge) {
        MouApplication.logInfo(MouFileManager.APP_NAME, "Uploading with The Forge")
        return await ForgeVTT_FilePicker.upload(source, folderPath, file, MouFileManager.getOptions(), {notify: false});
      } else {
        // @ts-ignore: ignore notify being a string (error in TLD)
        return await FilePicker.upload(source, folderPath, file, MouFileManager.getOptions(), {notify: false});
      }
    } catch (e) {
      MouApplication.logError(MouFileManager.APP_NAME, `Not able to upload file ${filename}`, e)
      return false
    }
  }

  /**
   * This function downloads a file and uploads it to FVTT server
   */
  static async downloadAllFiles(urls: string[], packPath: string, folder: string, force=false): Promise<boolean> {
    let success = true
    for(const url of urls) {
      const result = await MouFileManager.downloadFile(url, packPath, folder, force)
      if(!result) {
        success = false
      }
    }
    return success
  }

  /**
   * This function downloads a file and uploads it to FVTT server
   */
  static async downloadFileAsString(url: string): Promise<string> {
    const res = await fetch(url)
    if(res && res.status == 200) {
      return res.text()
    }
    return ""
  }

  /**
   * Returns true if file already exists
   * Keeps last browsed folder in cache (optimization)
   */
  static async fileExists(folder: string, filename: string): Promise<boolean> {
    let files = [] as string[]
    const path = `${folder}/${filename}`
    if(MouFileManager._cachedLastFolderFiles && MouFileManager._cachedLastFolderFiles.folder == folder) {
      files = MouFileManager._cachedLastFolderFiles.files
    } else {
      try {
        const browse = await FilePicker.browse(MouFileManager.getSource(), folder);
        files = browse.files.map(f => MouMediaUtils.getCleanURI(f))  
      } catch(e) { }
      MouFileManager._cachedLastFolderFiles = {
        folder: folder,
        files: files
      }
    }
    return files.includes(path)
  }

  /**
   * This function downloads a file and uploads it to FVTT server
   * Example : 
   *    uri: animated/Broken Tower_2.webm?se=...
   *    pack_path: https://mttestorage.blob.core.windows.net/creator/packname
   *    folder: {MOU_DEF_FOLDER}/scenes/creator/packname
   */
  static async downloadFile(uri: string, packPath: string, folder: string, force=false): Promise<FilePicker.UploadResult | false> {

    folder = MouMediaUtils.getCleanURI(folder)
    const filepath = MouMediaUtils.getCleanURI(uri.split("?")[0])
    const filename  = filepath.substring(filepath.lastIndexOf("/")+1)  // Broken Tower_2.webm (from above example)
    const relFolder = filepath.substring(0, filepath.lastIndexOf("/")) // animated (from above example)
    const targetFolder = folder + (folder.endsWith("/") ? "" : "/") + relFolder 
    const url = packPath.length > 0 ? `${packPath}/${uri}` : uri

    // check if file already downloaded
    await MouFileManager.createFolderRecursive(targetFolder)
    const browse = await FilePicker.browse(MouFileManager.getSource(), targetFolder);
    const files = browse.files.map(f => MouMediaUtils.getCleanURI(f))
    const path = `${targetFolder}/${filename}`
    if(!force && files.includes(path)) {
      MouApplication.logInfo(MouFileManager.APP_NAME, `File ${path} already exists. Download skipped!`)
      return { status: "success", path: path, message: "File already exists" };
    }

    let triesCount = 0
    const infoURL = url.split("?")[0]
    while(triesCount <= MouFileManager.RETRIES) {
      if(triesCount > 0) {
        MouApplication.logInfo(MouFileManager.APP_NAME, `${triesCount}# retry of downloading ${infoURL}`)
      }
      try {
        let res = await fetch(url)
        if(res && res.status == 200) {
          const blob = await res.blob()
          const uploadResult = await MouFileManager.uploadFile(new File([blob], filename, { type: blob.type, lastModified: new Date().getTime() }), filename, targetFolder, force)
          if(uploadResult && uploadResult.status == "success") {
            uploadResult.path = decodeURI(uploadResult.path)
            return uploadResult
          }
          else {
            MouApplication.logWarn(MouFileManager.APP_NAME, `MTTERR003 Download succeeded but upload failed for ${infoURL}: ${uploadResult}`)
          }
        }
        else {
          MouApplication.logWarn(MouFileManager.APP_NAME, `MTTERR001 Download failed for ${infoURL}: ${res}`)
        }
      } catch(e) {
        MouApplication.logError(MouFileManager.APP_NAME, `MTTERR001 Download failed for ${infoURL}`, e)
      }
      triesCount++
    }
    return false
  }


  /**
   * Returns the list of all files in folder (and its subfolders) matching filter
   */
  static async scanFolder(source: FilePicker.SourceType, path: string, debug?: boolean): Promise<string[]> {
    
    let list = [] as string[]
    if(debug) MouApplication.logInfo(MouFileManager.APP_NAME, `Assets: scanning ${path} ...`)
    const options = MouFileManager.getOptions() as AnyDict
    options.recursive = true
    const base = await FilePicker.browse(source, path, options);

    // for S3 source, check that bucket is configured
    if(source == "s3" && !options.bucket) {
      const errorMsg = (game as Game).i18n.localize("MOU.error_s3_bucket_not_specified")
      ui.notifications?.error(errorMsg, { permanent: true })
      MouApplication.logError(MouFileManager.APP_NAME, errorMsg)
      return list
    }
    
    // stop scanning if ignore.info file found
    if(base.files.find(f => f.endsWith("/ignore.info"))) {
      if(debug) MouApplication.logInfo(MouFileManager.APP_NAME, `File ignore.info found. Stop scanning ${path}.`)
      return list;
    }
    
    if(debug) MouApplication.logInfo(MouFileManager.APP_NAME, `Assets: ${base.files.length} assets found`)
    for (const file of base.files) {
      list.push(file);
    }

    // check if recursive (only supported on The Forge)
    for(const f of base.files) {
      const basepath = f.substring(0, f.lastIndexOf("/"))
      if(basepath.length > 0 && !decodeURI(basepath).endsWith(path)) {
        MouApplication.logWarn(MouFileManager.APP_NAME, `Recursive scan detected`, { basepath, path })
        return list
      }
    }
    
    for(const d of base.dirs) {
      const subpath = MouMediaUtils.getCleanURI(d)
      // workaround for infinite loop : folder must be a subfolder
      if( subpath.startsWith(path) ) {
        const files = await MouFileManager.scanFolder(source, subpath, debug)
        for (const file of files) {
          list.push(file);
        }
      } else if(debug) MouApplication.logWarn(MouFileManager.APP_NAME, `Assets: ignoring ${subpath} which is NOT a subfolder of ${path} as expected!`)
    }
    return list
  }

  /**
   * Downloads the specified JSON file and returns it as data
   */
  static async loadJSON(path: string): Promise<AnyDict> {
    // download index file from URL
    let indexData = {}
    const noCache = "?ms=" + new Date().getTime();
    const baseURL = await MouFileManager.getBaseURL() || ""
    const response = await fetch(baseURL + path + noCache, {cache: "no-store"}).catch(function(e) {
      MouApplication.logError(MouFileManager.APP_NAME, `Exception while downloading index ${path}`, e)
    });
    if(response && response.status == 200) {
      indexData = await response.json();
    }
    return indexData
  }

  /**
   * Stores provided JSON 
   */
  static async storeJSON(data: AnyDict, filename: string, folder: string): Promise<FilePicker.UploadResult | false> {
    return MouFileManager.uploadFile(
      new File([JSON.stringify(data)], filename, { type: "application/json", lastModified: new Date().getTime() }), 
      filename, 
      folder, 
      true)
  }

  /**
   * Loads an image
   */
  static loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = src;
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
    });
  }

  /**
   * This function retrieves the longest common base from a list of paths
   * Ex: 
   *   "https://assets.forge-vtt.com/bazaar/systems/pf1/assets/fonts/rpgawesome-webfont.svg"
   *   "https://assets.forge-vtt.com/bazaar/systems/pf1/assets/icons/feats/simple-weapon-proficiency.jpg"
   * ==> "https://assets.forge-vtt.com/bazaar/systems/pf1/assets/"
   */
  static findLongestCommonBase(strList: string[]): string {
    if(!strList || strList.length < 1) {
      return ""
    } else if(strList.length == 1) {
      return strList[0].substring(0, strList[0].lastIndexOf("/"))
    }

    let common = null
    for(const str of strList) {
      if(common == null) {
        common = str
        continue;
      }
      let maxCommonChars = common.length
      for(var i = 0; i < common.length; i++) {
        if(i >= str.length || common[i] != str[i]) {
          maxCommonChars = i
          break
        }
      }
      common = common.substring(0, maxCommonChars)
    }
    if(common == null) common = ""

    // only keep path up to folder (don't split path)
    const idx = common.lastIndexOf("/")
    return idx > 0 ? common.substring(0, idx) : ""
  }

  /**
   * Returns the folder path and media filename
   * For S3, The Forge and host servers, removes the base URL, keeping URI only
   */
  static async getMediaPaths(path: string, source?: string) : Promise<{ filename: string, folder: string }> {
    let mediaPath = path.split("?")[0]
    const baseURL = await MouFileManager.getBaseURL(source)
    // remove host full URL from image path (for S3)
    if(baseURL && mediaPath.startsWith(baseURL)) {
      mediaPath = mediaPath.substring(baseURL.length)
    }
    const lastSlash = mediaPath.lastIndexOf("/")
    return {
      filename: lastSlash > 0 ? mediaPath.substring(lastSlash +1) : mediaPath,
      folder: lastSlash > 0 ? mediaPath.substring(0, lastSlash) : ""
    }
  }

  /**
   * Generates a thumbnail based on the given URL, and stores it as filename in specified folder
   * Returns false if the file already existed
   */
  static async generateThumbnail(url: string, filename: string, folder: string, options?: { width: number, height: number }): Promise<boolean> {
    // check if thumbnail already exists
    if(await MouFileManager.fileExists(folder, filename)) {
      return false;
    }
    try {
      const thumb = await ImageHelper.createThumbnail(url, { width: options ? options.width : 200, height: options ? options.width : 200, center: true, format: "image/webp"})
      // convert to file
      const res = await fetch(thumb.thumb);
      const buf = await res.arrayBuffer();
      const thumbFile = new File([buf], filename, { type: "image/webp" })
      await MouFileManager.uploadFile(thumbFile, filename, folder, true)
      
      // clear cache to avoid (or mitigate) memory leaks
      // @ts-ignore
      for(const key of PIXI.Assets.cache._cacheMap.keys()) {
        // @ts-ignore
        await PIXI.Assets.unload(key)
      }
    } catch(e) {
      MouApplication.logError(MouFileManager.APP_NAME, `Not able to generate thumbnail for ${url}`, e)
    }

    return true
  }

}