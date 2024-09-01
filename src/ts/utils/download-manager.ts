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
   * Tries to extract the filename from the given url
   */
  private static extractFilename(url: string): string | null {
    const parsedUrl = new URL(url);
    const pathname = parsedUrl.pathname;
    const filenameWithExt = pathname.split('/').pop();
    if (!filenameWithExt) {
      return null;
    }
    return filenameWithExt;
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
    if(exist.length > 0 && !overwrite) return { status: "success", path: `${folderPath}/${filename}`, message: "File already exists" };
    
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
  static async downloadFile(url: string, folder: string, force=false): Promise<FilePicker.UploadResult | false> {

    folder = decodeURIComponent(folder)
    const filename = MouDownloadManager.extractFilename(url)
    if(!filename) {
      MouApplication.logError(MouDownloadManager.APP_NAME, `Couldn't extract filename from URL: ${url}`)
      return false
    }
    
    // check if file already downloaded
    await MouDownloadManager.createFolderRecursive(folder)
    const browse = await FilePicker.browse(MouDownloadManager.getSource(), folder);
    const files = browse.files.map(f => decodeURIComponent(f))
    const path = folder + (folder.endsWith("/") ? "" : "/") + filename
    if(!force && files.includes(path)) return { status: "success", path: path, message: "File already exists" };

    let triesCount = 0
    const infoURL = ("" + url).split("?")[0]
    while(triesCount <= MouDownloadManager.RETRIES) {
      if(triesCount > 0) {
        MouApplication.logInfo(MouDownloadManager.APP_NAME, `${triesCount}# retry of downloading ${infoURL}`)
      }
      try {
        let res = await fetch(url)
        if(res && res.status == 200) {
          const blob = await res.blob()
          const success = await MouDownloadManager.uploadFile(new File([blob], filename, { type: blob.type, lastModified: new Date().getTime() }), filename, folder, force)
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