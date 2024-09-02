import MouApplication from "../apps/application";
import { SETTINGS_S3_BUCKET } from "../constants";

declare var ForgeVTT: any;
declare var ForgeVTT_FilePicker: any;

export default class MouDownloadManager {

  static APP_NAME = "MouDownloadManager"
  static RETRIES = 2

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
   * Creates folders recursively (much better than previous)
   */
  static async createFolderRecursive(path: string) {
    const source = MouDownloadManager.getSource()
    // folder don't have to be created on S3 (automatically handled by S3 provider)
    if(source == "s3") return
    
    const folders = path.split("/")
    let curFolder = ""
    for( const f of folders ) {
      if(f.length == 0) continue
      const parentFolder = await FilePicker.browse(source, curFolder, MouDownloadManager.getOptions());
      curFolder += (curFolder.length > 0 ? "/" : "" ) + f
      const dirs = parentFolder.dirs.map(d => decodeURIComponent(d))
      if (!dirs.includes(decodeURIComponent(curFolder))) {
        try {
          MouApplication.logInfo(MouDownloadManager.APP_NAME, `Create folder ${curFolder}`)
          await FilePicker.createDirectory(source, curFolder, MouDownloadManager.getOptions());
        } catch(exc) {
          MouApplication.logError(MouDownloadManager.APP_NAME, `Not able to create ${curFolder}`, exc)
        }
      }
    }
  }

  /**
   * Uploads a file into the right folder (improved version)
   */
  static async uploadFile(file: File, filename: string, folderPath: string, overwrite = false): Promise<FilePicker.UploadResult | false> {
    const source = MouDownloadManager.getSource()
    await MouDownloadManager.createFolderRecursive(folderPath)
    
    // check if file already exist
    //const baseURL = await MoulinetteFileUtil.getBaseURL();
    let base = await FilePicker.browse(source, folderPath, MouDownloadManager.getOptions());
    let exist = base.files.filter(f => decodeURIComponent(f) == `${folderPath}/${filename}`)
    //if(exist.length > 0 && !overwrite) return { path: `${baseURL}${folderPath}/${filename}` };
    if(exist.length > 0 && !overwrite) {
      MouApplication.logInfo(MouDownloadManager.APP_NAME, `File ${folderPath}/${filename} already exists. Upoad skipped!`)
      return { status: "success", path: `${folderPath}/${filename}`, message: "File already exists" };
    }
    
    try {
      if (typeof ForgeVTT != "undefined" && ForgeVTT.usingTheForge) {
        MouApplication.logInfo(MouDownloadManager.APP_NAME, "Uploading with The Forge")
        return await ForgeVTT_FilePicker.upload(source, folderPath, file, MouDownloadManager.getOptions(), {notify: false});
      } else {
        // @ts-ignore: ignore notify being a string (error in TLD)
        return await FilePicker.upload(source, folderPath, file, MouDownloadManager.getOptions(), {notify: false});
      }
    } catch (e) {
      MouApplication.logError(MouDownloadManager.APP_NAME, `Not able to upload file ${filename}`, e)
      return false
    }
  }

  /**
   * This function downloads a file and uploads it to FVTT server
   */
  static async downloadAllFiles(urls: string[], packPath: string, folder: string, force=false): Promise<boolean> {
    for(const url of urls) {
      const result = await MouDownloadManager.downloadFile(url, packPath, folder, force)
      if(!result) {
        return false
      }
    }
    return true
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
   * This function downloads a file and uploads it to FVTT server
   * Example : 
   *    uri: animated/Broken Tower_2.webm?se=...
   *    pack_path: https://mttestorage.blob.core.windows.net/creator/packname
   *    folder: moulinette-v2/scenes/creator/packname
   */
  static async downloadFile(uri: string, packPath: string, folder: string, force=false): Promise<FilePicker.UploadResult | false> {

    folder = decodeURIComponent(folder)
    const filepath = decodeURI(uri.split("?")[0])
    const filename  = filepath.substring(filepath.lastIndexOf("/")+1)  // Broken Tower_2.webm (from above example)
    const relFolder = filepath.substring(0, filepath.lastIndexOf("/")) // animated (from above example)
    const targetFolder = folder + (folder.endsWith("/") ? "" : "/") + relFolder 
    const url = `${packPath}/${uri}`

    // check if file already downloaded
    await MouDownloadManager.createFolderRecursive(targetFolder)
    const browse = await FilePicker.browse(MouDownloadManager.getSource(), targetFolder);
    const files = browse.files.map(f => decodeURIComponent(f))
    const path = `${targetFolder}/${filename}`
    if(!force && files.includes(path)) {
      MouApplication.logInfo(MouDownloadManager.APP_NAME, `File ${path} already exists. Download skipped!`)
      return { status: "success", path: path, message: "File already exists" };
    }

    let triesCount = 0
    const infoURL = url.split("?")[0]
    while(triesCount <= MouDownloadManager.RETRIES) {
      if(triesCount > 0) {
        MouApplication.logInfo(MouDownloadManager.APP_NAME, `${triesCount}# retry of downloading ${infoURL}`)
      }
      try {
        let res = await fetch(url)
        if(res && res.status == 200) {
          const blob = await res.blob()
          const success = await MouDownloadManager.uploadFile(new File([blob], filename, { type: blob.type, lastModified: new Date().getTime() }), filename, targetFolder, force)
          if(success && success.status == "success") {
            return success
          }
          else {
            MouApplication.logWarn(MouDownloadManager.APP_NAME, `MTTERR003 Download succeeded but upload failed for ${infoURL}: ${success}`)
          }
        }
        else {
          MouApplication.logWarn(MouDownloadManager.APP_NAME, `MTTERR001 Download failed for ${infoURL}: ${res}`)
        }
      } catch(e) {
        MouApplication.logError(MouDownloadManager.APP_NAME, `MTTERR001 Download failed for ${infoURL}`, e)
      }
      triesCount++
    }
    return false
  }

}