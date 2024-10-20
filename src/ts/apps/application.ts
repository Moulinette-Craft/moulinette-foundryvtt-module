import { MODULE_ID, SETTINGS_PREVS } from "../constants";
import { AnyDict, MouModule } from "../types";

/**
 * This class server allow Moulinette Application to be independant from FVTT
 */
export default class MouApplication extends Application {
 
  // static & non-static application name
  static APP_NAME = "MouApplication";
  APP_NAME = MouApplication.APP_NAME
  
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
    return (game as Game).modules.get(MODULE_ID) as MouModule;
  }

  static async setSettings(key: string, value: unknown) : Promise<unknown> {
    MouApplication.logInfo(MouApplication.APP_NAME, `Storing data for settings ${key}`)
    return (game as Game).settings.set("moulinette", key, value)  
  }

  static getSettings(key: string): unknown {
    return (game as Game).settings.get("moulinette", key)
  }

  /** Forces FoundryVTT to automatically resize the window (when auto) */
  autoResize() {
    this.setPosition({ left: this.position.left, top: this.position.top, height: this.position.height, width: this.position.width})
  }


  /**
   * Adjusts the position of the application window based on previously stored settings.
   * 
   * @param options - The options object containing the current position and size of the application window.
   * 
   * If the `storePosition` option is enabled, this method retrieves the previous window position
   * from the settings and updates the `options` object with these values.
   */
  static adjustPosition(options: ApplicationOptions, APP_NAME: string) {
    const prevSettings = MouApplication.getSettings(SETTINGS_PREVS) as AnyDict
    if("winPos" in prevSettings && APP_NAME in prevSettings["winPos"]) {
      const prevPos = prevSettings["winPos"][APP_NAME]
      options.left = prevPos.left
      options.top = prevPos.top
      options.width = prevPos.width
      options.height = prevPos.height
    }
  }

  /**
   * Save position when window moves or resized
   */
  storePosition() {
    const prevSettings = MouApplication.getSettings(SETTINGS_PREVS) as AnyDict
    if(!("winPos" in prevSettings)) {
      prevSettings["winPos"] = {}
    }
    const prevPos = this.APP_NAME in prevSettings["winPos"] ? prevSettings["winPos"][this.APP_NAME] : {}
    if(this.position.left != prevPos.left || this.position.top != prevPos.top || this.position.width != prevPos.width || this.position.height != prevPos.height) {
      prevSettings["winPos"][this.APP_NAME] = this.position
      MouApplication.setSettings(SETTINGS_PREVS, prevSettings)
      this.logInfo("Window position stored!")
    }
  }
}