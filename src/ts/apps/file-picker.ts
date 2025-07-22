import { AnyDict } from "../types";
import MouBrowser from "./browser";

export class MoulinetteFilePicker extends FilePicker {
  
  constructor(options={}) {
    super(options);
  }

  override async browse(target: string, options={} as AnyDict): Promise<any> {
    if ( (game as Game).world && !(game as Game).user!.can("FILES_BROWSE") ) return this;
    
    const v12 = (game as Game).version.startsWith("12.")
    const kbManager = v12 ? KeyboardManager : (foundry as any).helpers.interaction.KeyboardManager;
    const shiftKeyDown = (game as Game).keyboard!.isModifierActive(kbManager.MODIFIER_KEYS.SHIFT)
    const forceDefault = shiftKeyDown

    if(forceDefault || !["image", "imagevideo"].includes(this.type)) {
      return super.browse(target, options);
    }

    const browser = new MouBrowser({} as ApplicationOptions, "Image", this.options.callback ? this.options.callback : undefined);
    browser.render(true)

    return {
      dirs: [],
      files: [],
      target: target
    };
  }

  /*
  static override async browse(source: string, target: string, options={}): Promise<any> {
    console.log("browse", source, target, options);
    return {
      dirs: [],
      files: [],
      target: target
    };
  }*/
}