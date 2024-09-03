
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
  static prettyFilesize(filesize : number) {
    if(filesize < 1024) {
      return `${filesize.toLocaleString()} B`
    } else if(filesize < 1024*1024) {
      const size = filesize / 1024
      return `${size.toFixed(1).toLocaleString()} KB`
    } else {
      const size = filesize / (1024*1024)
      return `${size.toFixed(1).toLocaleString()} MB`
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
    let minutes = Math.floor(seconds / 60);
    let hours = Math.floor(seconds / 3600);
    seconds = seconds % 60;
    
    // Format MM:SS for duration less than 1 hour
    if (hours === 0) {
      return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    } else {
      return `${hours}:${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }
  }

}