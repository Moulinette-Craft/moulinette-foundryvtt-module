export interface IMediaAsset {
  _id: string;
  filepath: string;
  basepath: string;
  filesize: number;
  filesizeHuman: string;
  main_color: string;
  tags: Array<string>;
  size: Object;
  type: string;
  pack_ref: number;
  name: string;
}

export default class MouMediaUtils {

  /** Generates pretty names based of filepaths **/
  static prettyMediaNames(assets: Array<IMediaAsset>) {
    assets.forEach(a => {
      a.basepath = a.filepath.replace(/\.[^/.]+$/, "") // remove extension
      let name = a.basepath.split("/").pop()           // keep filename only (not entire path)
      name = name?.replace(/[-_]/g, " ")                // replace _ and - by spaces
      a.name = name ? name : a.filepath
    });
  }

  /** Generates human readable filesizes **/
  static prettyFilesizes(assets: Array<IMediaAsset>) {
    assets.forEach(a => {
      if(a.filesize < 1024) {
        a.filesizeHuman = `${a.filesize.toLocaleString()} B`
      } else if(a.filesize < 1024*1024) {
        const size = a.filesize / 1024
        a.filesizeHuman = `${size.toFixed(1).toLocaleString()} KB`
      } else {
        const size = a.filesize / (1024*1024)
        a.filesizeHuman = `${size.toFixed(1).toLocaleString()} MB`
      }
    });
  }
  
}