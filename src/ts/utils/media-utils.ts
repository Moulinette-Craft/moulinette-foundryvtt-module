import { MouCollectionAssetTypeEnum } from "../apps/collection";

export default class MouMediaUtils {

  /** Returns the base path (URL without extension) of an asset (path) */
  static getBasePath(filepath: string) {
    return filepath.replace(/\.[^/.]+$/, "")
  }

  /** Generates pretty name based of filepath **/
  static prettyMediaName(filepath: string) {
    const basepath = MouMediaUtils.getBasePath(decodeURI(filepath))
    let name = basepath.split("/").pop()                  // keep filename only (not entire path)
    name = name?.replace(/[-_]/g, " ")                    // replace _ and - by spaces
    name = name?.split(' ')                               // capitalize the first letter of each word
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    return name ? name : decodeURI(filepath)
  }

  /** Generates a human readable filesize **/
  static prettyFilesize(filesize : number, decimals = 1) {
    if(filesize < 1024) {
      return `${filesize.toLocaleString()} B`
    } else if(filesize < 1024*1024) {
      const size = filesize / 1024
      if(decimals == 0) {
        return `${Math.round(size).toLocaleString()} KB`
      } else {
        return `${size.toFixed(decimals).toLocaleString()} KB`
      }
    } else {
      const size = filesize / (1024*1024)
      if(decimals == 0) {
        return `${Math.round(size).toLocaleString()} MB`
      } else {
        return `${size.toFixed(decimals).toLocaleString()} MB`
      }
    }
  }

  /** Generates a human readable number **/
  static prettyNumber(number : number, full: boolean) {
    if(full) {
      return number.toLocaleString()
    }
    // short version (K,M)
    if(number < 1000) {
      return number 
    }
    else if(number < 1000000) {
      return `${(number / 1000).toFixed(1)}K`
    } else {
      return `${(number / 1000000).toFixed(1)}M`
    }
  }

  /** Generates a human readable duration **/
  static prettyDuration(seconds: number) {
    seconds = Math.round(seconds)
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    // Format MM:SS for duration less than 1 hour
    if (hours === 0) {
      return `${minutes}:${seconds < 10 ? '0' : ''}${remainingSeconds}`;
    } else {
      return `${hours}:${minutes < 10 ? '0' : ''}${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
    }
  }

  /** Copies data (string) to clipboard */
  static copyToClipboard(data: string) {
    if(data) {
      navigator.clipboard.writeText(data).then(() => {
        ui.notifications?.info((game as Game).i18n.localize("MOU.clipboard_copy_success"))
      })
      .catch(() => {
        ui.notifications?.warn((game as Game).i18n.localize("MOU.clipboard_copy_failed"))
      });
    }
  }

  /** Returs the FA icon representing the asset type */
  static getIcon(type: MouCollectionAssetTypeEnum): string | null {
    switch(type) {
      case MouCollectionAssetTypeEnum.Actor: return "fa-solid fa-user";
      case MouCollectionAssetTypeEnum.Playlist:
      case MouCollectionAssetTypeEnum.Audio: return "fa-solid fa-music";
      case MouCollectionAssetTypeEnum.Item: return "fa-solid fa-suitcase";
      case MouCollectionAssetTypeEnum.JournalEntry: return "fa-solid fa-book-open";
      case MouCollectionAssetTypeEnum.Image: return "fa-solid fa-image";
      case MouCollectionAssetTypeEnum.Scene:
      case MouCollectionAssetTypeEnum.Map: return "fa-solid fa-map";
      case MouCollectionAssetTypeEnum.PDF: return "fa-solid fa-file-pdf";
      case MouCollectionAssetTypeEnum.Macro: return "fa-solid fa-code";
    }
    return null
  }

  /**
   * Returns metadata from provided image (as URL)
   */
  static async getMetadataFromImage(url: string): Promise<{ width: number, height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = reject;
      img.src = url;
    });
  } 

  /**
   * Returns metadata for provided audio (as URL)
   */
  static async getMetadataFromAudio(url: string): Promise<{ duration: number }> {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.onloadedmetadata = () => {
        resolve({ duration: Math.round(audio.duration) }); // Durée en secondes
      };
      audio.onerror = reject;
      audio.src = url;
    });
  }
}