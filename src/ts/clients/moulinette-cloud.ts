import MouApplication from "../apps/application";
import { MODULE_ID, MOU_API, SETTINGS_SESSION_ID } from "../constants";
import { AnyDict, MouModule } from "../types";

export default class MouCloudClient {

  static APP_NAME = "MouCloudClient"
  static HEADERS = { 'Accept': 'application/json', 'Content-Type': 'application/json' }
  static AZURE_BASEURL = "https://mttestorage.blob.core.windows.net/"

  private static async _fetch(uri: string, method: string, parameters?: {}, data?:AnyDict) {
    let init:AnyDict = {
      method: method,
      headers: MouCloudClient.HEADERS
    }
    if( data ) { init.body = JSON.stringify(data) }

    let params = ""
    if(parameters) {
      Object.entries(parameters).forEach((entry) => {
        params += `${entry[0]}=${entry[1]}&`
      })
    }

    const response = await fetch(`${MOU_API}${uri}` + (params.length > 0 ? `?${params}` : ""), init)
    if (!response.ok) {
      throw new Error(`HTTP error! Status : ${response.status}`);
    }
    return await response.json()
  }

  static async apiGET(uri: string, parameters?: {}) {
    return MouCloudClient._fetch(uri, "GET", parameters)
  }

  static async apiPOST(uri: string, data: AnyDict, parameters?: {}) {
    return MouCloudClient._fetch(uri, "POST", parameters, data)
  }

  /**
   * Returns true if provided session is still valid
   */
  async isUserAuthenticated(session_id: string, auth_source: string) {
    let hasValidSession = false
    try {
      const response = await MouCloudClient.apiGET(`/session/valid`, { 
        session: session_id, 
        source: auth_source,
        ms: "" + new Date().getTime()
      })
      hasValidSession = response && response.valid
    } catch(error: any) {
      MouApplication.logError(MouCloudClient.APP_NAME, "Failed to connect Moulinette server", error)
    }
    return hasValidSession
  }

  /**
   * Returns user data from session (store in settings)
   */
  async getUser(force = false, forceRefresh = false) {
    const module = (game as Game).modules.get(MODULE_ID) as MouModule;
    const sessionId = MouApplication.getSettings(SETTINGS_SESSION_ID)
    
    // moulinette cloud is disabled
    /*
    if(!game.settings.get("moulinette-core", "enableMoulinetteCloud")) {
      console.log("Moulinette | Moulinette Cloud is disabled.")
      game.moulinette.user = {
        id: game.settings.get("moulinette", "userId"),
        hasEarlyAccess: function() { return false }
      }
      return game.moulinette.user
    }
      */
    // default behaviour
    if((game as Game)?.user?.isGM && (!module.cache.user || force)) {
      MouApplication.logInfo(MouCloudClient.APP_NAME, "Retrieving user details...")
      const response = await MouCloudClient.apiGET(`/user`, { 
        force: forceRefresh ? "1" : "0", 
        session: sessionId,
        ms: "" + new Date().getTime()
      })

      if(response) {
        module.cache.user = response
        // GUID has been updated (after 24 hours, for security reasons)
        if(response.guid) {
          await MouApplication.setSettings(SETTINGS_SESSION_ID, response.guid)
          delete module.cache.user.guid
        }
      } 
    }

    // update control icon
    const isValidUser = module.cache.user && module.cache.user.fullName
    $("#controls .control-tool[data-tool='authenticated'] i").attr('class', isValidUser ? "fa-solid fa-user-check" : "fa-solid fa-user-xmark")

    return module.cache.user
  }
}