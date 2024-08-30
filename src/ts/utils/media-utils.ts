
export default class MouMediaUtils {

  /** Returns the base path (URL without extension) of an asset (path) */
  static getBasePath(filepath: string) {
    return filepath.replace(/\.[^/.]+$/, "")
  }

  /** Generates pretty name based of filepath **/
  static prettyMediaNames(filepath: string) {
    const basepath = MouMediaUtils.getBasePath(filepath)
    let name = basepath.split("/").pop()                  // keep filename only (not entire path)
    name = name?.replace(/[-_]/g, " ")                    // replace _ and - by spaces
    name = name ? name : filepath
    return name
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
  
}