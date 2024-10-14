import MouApplication from "../apps/application";
import MouBrowser from "../apps/browser";

export interface MouBBCAudio {
  id: string,
  author: string,
  name: string,
  desc: string,
  url: string,
}

export class MouBBCSoundsClient {
  
  static APP_NAME = "MouBBCSoundsClient"
  static API = "https://r9fanuyewg.execute-api.eu-west-1.amazonaws.com/prod/api/sfx/search"
  static HEADERS = { 'Accept': 'application/json', 'Content-Type': 'application/json; charset=utf-8' }
  
  token = null
  
  /*
   * Query BBC server
   */
  static async searchAudio(query: string, page: number) : Promise<{ sounds: MouBBCAudio[], count: number }> {
    const content = {"criteria": { "from": page * MouBrowser.PAGE_SIZE, "size": MouBrowser.PAGE_SIZE, "query": query } }
    const response = await fetch(MouBBCSoundsClient.API, { method:'POST', headers: MouBBCSoundsClient.HEADERS, body: JSON.stringify(content)}).catch(function(e) {
      MouApplication.logError(MouBBCSoundsClient.APP_NAME, "Cannot establish connection to server BBC Sound Effects (aws)", e)
      return null
    });
    if(!response) {
      MouApplication.logError(MouBBCSoundsClient.APP_NAME, "Invalid (empty) response from server BBC Sound Effects (aws)")
      return { sounds: [], count: 0 }
    }

    const responseJSON = await response.json()
    return { sounds: responseJSON.results, count: responseJSON.total }
  }
}