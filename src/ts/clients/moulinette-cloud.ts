import { MOU_API } from "../constants";

export default class MouCloudClient {

  
  private static async apiGET(uri: string) {
    const response = await fetch(`${MOU_API}${uri}`);    
    if (!response.ok) {
        throw new Error(`HTTP error! Status : ${response.status}`);
    }
    return await response.json()
  }

  
  async randomAssets(type: string) {
    return await MouCloudClient.apiGET(`/assets/random/${type}`)
  }
  
}