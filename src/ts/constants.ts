import { id } from "../module.json";

export const MODULE_ID = id;

export const MOU_SERVER_URL = "http://127.0.0.1:5000"

export const MOU_DEF_FOLDER = "moulinette-v2"

export const MOU_API = `${MOU_SERVER_URL}/api/v2`
export const MOU_STORAGE = "https://mttestorage.blob.core.windows.net/"
export const MOU_STORAGE_PUB = "https://moulinette-previews.nyc3.cdn.digitaloceanspaces.com/"

export const PATREON_CLIENT_ID = "K3ofcL8XyaObRrO_5VPuzXEPnOVCIW3fbLIt6Vygt_YIM6IKxA404ZQ0pZbZ0VkB"
export const DISCORD_CLIENT_ID = "1104472072853405706"

export const SETTINGS_SESSION_ID = "session_ID"
export const SETTINGS_USE_FOLDERS = "use_folders"
export const SETTINGS_S3_BUCKET = "s3_bucket"
export const SETTINGS_COLLECTION_CLOUD = "cloud_collection"
export const SETTINGS_COLLECTION_LOCAL = "local_collection"
export const SETTINGS_DATA_EXCLUSION = "dataExclusions"

export const MEDIA_IMAGES = ["apng", "avif", "bmp", "gif", "jpeg", "png", "svg", "tiff", "webp"]
export const MEDIA_VIDEOS = ["m4v", "mp4", "ogv", "webm"]
export const MEDIA_AUDIO = ["aac", "flac", "m4a", "mid", "mp3", "ogg", "opus", "wav", "webm"]