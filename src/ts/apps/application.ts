import { MODULE_ID } from "../constants";
import { MouModule } from "../types";

/**
 * This class server allow Moulinette Application to be independant from FVTT
 */
export default class MouApplication extends Application {
 
  static APP_NAME = "MouApplication";

  APP_NAME = "Moulinette";        // default application name

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
}