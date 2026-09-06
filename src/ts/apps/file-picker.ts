import { AnyDict } from "../types";
import MouApplication from "./application";
import MouBrowser from "./browser";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const FilePickerBase: any = FilePicker;

export class MoulinetteFilePicker extends FilePickerBase {

  constructor(options={}) {
    super(options);
  }

  async browse(target: string, options={} as AnyDict): Promise<any> {
    if ( (game as Game).world && !(game as Game).user!.can("FILES_BROWSE") ) return this;

    const v12 = (game as Game).version.startsWith("12.")
    const kbManager = v12 ? KeyboardManager : (foundry as any).helpers.interaction.KeyboardManager;
    const shiftKeyDown = (game as Game).keyboard!.isModifierActive(kbManager.MODIFIER_KEYS.SHIFT)
    const forceDefault = shiftKeyDown || MouApplication.getModule().cache.forceDefaultPicker;

    if(forceDefault || !["image", "imagevideo"].includes(this.type)) {
      MouApplication.getModule().cache.forceDefaultPicker = true;
      return super.browse(target, options);
    }

    const browser = new MouBrowser({}, "Image", this.options.callback ? this.options.callback : undefined);
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