import { MODULE_ID, SETTINGS_ENABLE_PLAYERS } from "../constants";
import { AnyDict } from "../types";
import MouApplication from "./application";
import MouBrowser from "./browser";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
// Since Foundry v13 the global `FilePicker` is deprecated in favor of
// `foundry.applications.apps.FilePicker.implementation`.
const FilePickerBase: any = (foundry as any).applications?.apps?.FilePicker?.implementation ?? FilePicker;

export class MoulinetteFilePicker extends FilePickerBase {

  constructor(options={}) {
    super(options);
  }

  async browse(target: string, options={} as AnyDict): Promise<any> {
    if ( (game as Game).world && !(game as Game).user!.can("FILES_BROWSE") ) return this;

    // The Moulinette browser gives access to the whole content library. Non-GM users must not get it
    // unless the GM explicitly enabled Moulinette for players, otherwise fall back to the default picker.
    const playersEnabled = ((game as Game).settings as AnyDict).get(MODULE_ID, SETTINGS_ENABLE_PLAYERS) as boolean
    if(!(game as Game).user?.isGM && !playersEnabled) {
      return super.browse(target, options);
    }

    const kbManager = (foundry as any).helpers.interaction.KeyboardManager;
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