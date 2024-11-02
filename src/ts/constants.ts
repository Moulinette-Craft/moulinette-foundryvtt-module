import { id } from "../module.json";


export const MODULE_ID = id;
export const MOU_SERVER_URL = "https://assets-dev.moulinette.cloud"
//export const MOU_SERVER_URL = "http://127.0.0.1:5000"
export const MOU_API = `${MOU_SERVER_URL}/api/v2`
export const MOU_STORAGE = "https://mttestorage.blob.core.windows.net/"
export const MOU_STORAGE_PUB = "https://moulinette-previews.nyc3.cdn.digitaloceanspaces.com/"

export const PATREON_CLIENT_ID = "K3ofcL8XyaObRrO_5VPuzXEPnOVCIW3fbLIt6Vygt_YIM6IKxA404ZQ0pZbZ0VkB"
export const DISCORD_CLIENT_ID = "1104472072853405706"

export const SETTINGS_SESSION_ID = "session_ID"
export const SETTINGS_USE_FOLDERS = "use_folders"
export const SETTINGS_ENABLE_PLAYERS = "enable_players"
export const SETTINGS_S3_BUCKET = "s3_bucket"
export const SETTINGS_COLLECTION_CLOUD = "cloud_collection"
export const SETTINGS_COLLECTION_LOCAL = "local_collection"
export const SETTINGS_DATA_EXCLUSION = "dataExclusions"
export const SETTINGS_PREVS = "prevs"

/**
 * The constants below can be overridden using the following macro :
 * `game.modules.get("moulinette").configs.[CONFIG_NAME] = [NEW_VALUE]`
 * 
 * Example:
 * `game.modules.get("moulinette").configs.MOU_DEF_FOLDER = "moufolder"`
 */
export default class MouConfig {
  
  // default folder color
  static MOU_DEF_FOLDER_COLOR = "#e87209"

  // default folder where all assets & thumbs are stored
  static MOU_DEF_FOLDER = "moulinette-v2" 
  static MOU_DEF_THUMBS = `${MouConfig.MOU_DEF_FOLDER}/thumbs`

  // default image displayed in case of missing images
  static MOU_DEF_NOTHUMB = 'modules/moulinette/img/no-photo.webp'

  // supported media types
  static MEDIA_IMAGES = ["apng", "avif", "bmp", "gif", "jpeg", "jpg", "png", "svg", "tiff", "webp"]
  static MEDIA_VIDEOS = ["m4v", "mp4", "ogv", "webm"]
  static MEDIA_AUDIO = ["aac", "flac", "m4a", "mid", "mp3", "ogg", "opus", "wav", "webm"]

  // starting from which dimension, image is considered a map
  static MEDIA_MAP_THRESHOLD = 1000

  // after how many entries, the progress bar gets updated
  static FILEMANAGER_LOOP_UPDATE = 100
}