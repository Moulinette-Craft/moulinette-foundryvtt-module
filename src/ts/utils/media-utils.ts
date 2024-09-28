import { MouCollectionAssetTypeEnum } from "../apps/collection";

/**
 * A utility class for working with media files.
 */
export default class MouMediaUtils {

  /**
   * Extracts the file extension from a given file path.
   * 
   * @param filepath - The full path of the media file.
   * @returns The file extension of the media file.
   */
  static getBasePath(filepath: string) {
    return filepath.replace(/\.[^/.]+$/, "")
  }

  /**
   * Generates a human-readable name from a given file path.
   * 
   * This function performs the following transformations:
   * 1. Extracts the filename from the full file path.
   * 2. Replaces underscores and hyphens with spaces.
   * 3. Capitalizes the first letter of each word.
   * 
   * @param filepath - The full path of the media file.
   * @returns A prettified version of the media file name. If the filename cannot be determined, returns the original file path.
   */
  static prettyMediaName(filepath: string) {
    const basepath = MouMediaUtils.getBasePath(decodeURI(filepath))
    let name = basepath.split("/").pop()                  // keep filename only (not entire path)
    name = name?.replace(/[-_]/g, " ")                    // replace _ and - by spaces
    name = name?.split(' ')                               // capitalize the first letter of each word
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    return name ? name : decodeURI(filepath)
  }

  
  /**
   * Converts a filesize in bytes to a human-readable string with appropriate units (B, KB, MB).
   *
   * @param filesize - The size of the file in bytes.
   * @param decimals - The number of decimal places to include in the formatted string. Defaults to 1.
   * @returns A string representing the filesize in a human-readable format.
   */
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

  
  /**
   * Formats a number into a more readable string representation.
   * 
   * @param number - The number to format.
   * @param full - If true, returns the full number with commas as thousand separators.
   *               If false, returns a shortened version with 'K' for thousands and 'M' for millions.
   * 
   * @returns A string representing the formatted number.
   */
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

  /**
   * Converts a duration in seconds to a human-readable string format.
   * 
   * The format will be `MM:SS` if the duration is less than an hour,
   * and `HH:MM:SS` if the duration is an hour or more.
   * 
   * @param seconds - The duration in seconds to be converted.
   * @returns A string representing the formatted duration.
   */
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

  /**
   * Copies the provided string data to the clipboard.
   * 
   * @param data - The string data to be copied to the clipboard.
   * 
   * @remarks
   * This method uses the `navigator.clipboard.writeText` API to copy the text to the clipboard.
   * If the copy operation is successful, a success notification is displayed.
   * If the copy operation fails, a warning notification is displayed.
   * 
   * @example
   * ```typescript
   * const text = "Hello, World!";
   * copyToClipboard(text);
   * ```
   */
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

  /**
   * Returns the appropriate Font Awesome icon class for a given asset type.
   * 
   * @param type - The type of the asset.
   * @returns The Font Awesome icon class for the given asset type.
   */
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
   * Returns the appropriate color for a given asset type.
   * 
   * @param type - The type of the asset.
   * @returns The color for the given asset type.
   */
  static async getMetadataFromMedia(url: string): Promise<{ width: number, height: number }> {
    if(url.endsWith(".mp4") || url.endsWith(".webm")) {
      return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.onloadedmetadata = () => {
          resolve({ width: video.videoWidth, height: video.videoHeight });
        };
        video.onerror = reject;
        video.src = url;
      });
    }
    else {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          resolve({ width: img.width, height: img.height });
        };
        img.onerror = reject;
        img.src = url;
      });
    }
  } 

  /**
   * Returns the appropriate color for a given asset type.
   * 
   * @param type - The type of the asset.
   * @returns The color for the given asset type.
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