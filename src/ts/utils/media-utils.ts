export interface IMediaAsset {
  _id: string;
  filepath: string;
  basepath: string;
  filesize: number;
  main_color: string;
  tags: Array<string>;
  size: Object;
  type: string;
  pack_ref: number;
  name: string;
}

export default class MouMediaUtils {

  /** Generates pretty names based of filepaths and generates basepaths **/
  static prettyMediaNames(assets: Array<IMediaAsset>) {
    assets.forEach(a => {
      a.basepath = a.filepath.replace(/\.[^/.]+$/, "") // remove extension
      let name = a.basepath.split("/").pop()           // keep filename only (not entire path)
      name = name?.replace(/[-_]/g, " ")                // replace _ and - by spaces
      a.name = name ? name : a.filepath
    });
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
  
}