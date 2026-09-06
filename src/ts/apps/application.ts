import { MODULE_ID, SETTINGS_PREVS } from "../constants";
import { AnyDict, MouModule } from "../types";

// foundry.applications.api typings are still incomplete in fvtt-types for this kind of
// generic mixin composition, so we grab the mixin/base classes through an AnyDict cast
// rather than fighting the generics.
const FoundryApplicationsApi = foundry.applications.api as AnyDict;
const MouApplicationV2Base = FoundryApplicationsApi.HandlebarsApplicationMixin(FoundryApplicationsApi.ApplicationV2);

/**
 * This class serves to allow Moulinette Applications to be independent from FVTT,
 * and is now based on ApplicationV2 + HandlebarsApplicationMixin.
 */
export default class MouApplication extends MouApplicationV2Base {

  // TS synthesizes a zero-arg constructor for a class extending an `any`-typed base when
  // no constructor is declared explicitly - an explicit, forwarding one is required here
  // so that subclasses can keep calling super(options) with their own options object.
  constructor(...args: any[]) {
    super(...args);
  }

  // static & non-static application name
  static APP_NAME = "MouApplication";
  APP_NAME = MouApplication.APP_NAME

  static _timeout: ReturnType<typeof setTimeout> | null // timeout object to avoid too many settings updates

  static logDebug(source: string, message: string, data?: any) {
    const module = MouApplication.getModule()
    if(module.debug) {
      if(data !== undefined) {
        console.debug(`${source} | ${message}`, data);
      } else {
        console.debug(`${source} | ${message}`);
      }
    }
  }

  static logInfo(source: string, message: string, data?: any) {
    if(data !== undefined) {
      console.log(`${source} | ${message}`, data);
    } else {
      console.log(`${source} | ${message}`);
    }
  }

  static logWarn(source: string, message: string, data?: any) {
    if(data !== undefined) {
      console.warn(`${source} | ${message}`, data);
    } else {
      console.warn(`${source} | ${message}`);
    }
  }

  static logError(source: string, message: string, data?: any, error?: any) {
    if(data !== undefined) {
      console.error(`${source} | ${message}`, data);
    } else {
      console.error(`${source} | ${message}`);
    }
    if(error) {
      console.error(error)
    }
  }

  logDebug(message: string, data?: any) { MouApplication.logDebug(this.APP_NAME, message, data) }
  logInfo(message: string, data?: any) { MouApplication.logInfo(this.APP_NAME, message, data) }
  logWarn(message: string, data?: any) { MouApplication.logWarn(this.APP_NAME, message, data) }
  logError(message: string, data?: any, error?: Error) { MouApplication.logError(this.APP_NAME, message, data, error) }

  static getModule(): MouModule {
    return ((game as Game).modules as unknown as Map<string, unknown>).get(MODULE_ID) as MouModule;
  }

  /**
   * Sets a setting with a specified key and value after a debounce period of 500ms.
   * If a previous timeout is pending, it will be cleared and reset.
   *
   * @param key - The key for the setting to be stored.
   * @param value - The value to be stored for the specified key.
   * @returns A promise that resolves once the setting is stored.
   */
  static async setSettings(key: string, value: unknown, delay: boolean = false) {
    if (MouApplication._timeout) {
      clearTimeout(MouApplication._timeout);
    }
    if(delay) {
      MouApplication._timeout = setTimeout(() => {
        MouApplication.logInfo(MouApplication.APP_NAME, `Storing data for settings ${key}`);
        ((game as Game).settings as AnyDict).set("moulinette", key, value);
        MouApplication._timeout = null;
      }, 500);
    } else {
      MouApplication.logInfo(MouApplication.APP_NAME, `Storing data for settings ${key}`);
      await ((game as Game).settings as AnyDict).set("moulinette", key, value);
      MouApplication._timeout = null;
    }
  }

  static getSettings(key: string): unknown {
    return ((game as Game).settings as AnyDict).get("moulinette", key)
  }

  /**
   * Forces FoundryVTT to automatically resize the window (when height/width is "auto").
   * ApplicationV2 keeps the same setPosition()/position API as v1 for this purpose.
   */
  autoResize() {
    const pos = (this as AnyDict).position;
    (this as AnyDict).setPosition({ left: pos.left, top: pos.top, height: pos.height, width: pos.width })
  }

  /**
   * Adjusts the given options (mutated in place) based on the previously stored window
   * position for the given application name.
   *
   * V2: DEFAULT_OPTIONS is a static plain object (no longer a computed getter), so this
   * is now called from the constructor (before calling super()) instead of from
   * `defaultOptions`.
   *
   * @param options - The options object containing the current position and size of the application window.
   *
   * If the `storePosition` option is enabled, this method retrieves the previous window position
   * from the settings and updates the `options` object with these values.
   */
  static adjustPosition(options: AnyDict, APP_NAME: string): AnyDict {
    const prevSettings = MouApplication.getSettings(SETTINGS_PREVS) as AnyDict
    if("winPos" in prevSettings && APP_NAME in prevSettings["winPos"]) {
      const prevPos = prevSettings["winPos"][APP_NAME]
      options.position = options.position || {}
      options.position.left = prevPos.left
      options.position.top = prevPos.top
      options.position.width = prevPos.width
      options.position.height = prevPos.height
    }
    return options
  }

  /**
   * Save position when window moves or resized
   */
  storePosition() {
    const prevSettings = MouApplication.getSettings(SETTINGS_PREVS) as AnyDict
    if(!("winPos" in prevSettings)) {
      prevSettings["winPos"] = {}
    }
    const position = (this as AnyDict).position
    const prevPos = this.APP_NAME in prevSettings["winPos"] ? prevSettings["winPos"][this.APP_NAME] : {}
    if(position.left != prevPos.left || position.top != prevPos.top || position.width != prevPos.width || position.height != prevPos.height) {
      prevSettings["winPos"][this.APP_NAME] = position
      MouApplication.setSettings(SETTINGS_PREVS, prevSettings)
      this.logInfo("Window position stored!")
    }
  }
}
