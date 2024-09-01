import { MODULE_ID } from "../constants";
import { MouModule } from "../types";

/**
 * This class server allow Moulinette Application to be independant from FVTT
 */
export default class MouApplication extends Application {
 
  static APP_NAME = "MouApplication";

  APP_NAME = "Moulinette";        // default application name

  static logInfo(source: string, message: string) {
    console.log(`${source} | ${message}`); 
  }

  static logWarn(source: string, message: string) {
    console.warn(`${source} | ${message}`); 
  }

  static logError(source: string, message: string, error?: any) {
    console.error(`${source} | ${message}`); 
    if(error) {
      console.error(error)
    }
  }

  logInfo(message: string) { MouApplication.logInfo(this.APP_NAME, message) }
  logWarn(message: string) { MouApplication.logWarn(this.APP_NAME, message) }
  logError(message: string, error?: Error) { MouApplication.logError(this.APP_NAME, message, error) }

  getModule(): MouModule {
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