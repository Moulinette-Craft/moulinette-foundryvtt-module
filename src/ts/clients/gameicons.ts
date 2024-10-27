import MouApplication from "../apps/application";
import MouBrowser from "../apps/browser";
import MouConfig, { MOU_API } from "../constants";
import { AnyDict } from "../types";
import MouFileManager from "../utils/file-manager";

export interface MouGameIcon {
  id: string,
  author: string,
  name: string,
  desc: string,
  url: string,
}

export class MouGameIconsClient {
  
  static APP_NAME = "GameIconsClient"
  static ICONS_COUNT = 0  // keep it to avoid useless requests to server
  
  /**
   * Extracts and returns the text content from a given HTML string.
   * This effectively removes any HTML tags.
   *
   * @param s - The HTML string to extract text from.
   * @returns The text content extracted from the HTML string.
   */
  private static extractTextFromHTML(s: string) {
    var span = document.createElement('span');
    span.innerHTML = s;
    return span.textContent || span.innerText;
  };

  private static async queryServer(query: string, hitsPerPage: number, page: number): Promise<Response | null> {
    // prepare request
    const request = { requests: [{
      indexName: "icons",
      hitsPerPage: hitsPerPage,
      params: `query=${query}&page=${page}`
    }]}

    // execute search
    const headers = { 'Accept': 'application/json', 'Content-Type': 'application/json' }
    const params = `x-algolia-application-id=9HQ1YXUKVC&x-algolia-api-key=fa437c6f1fcba0f93608721397cd515d`
    const response = await fetch("https://9hq1yxukvc-3.algolianet.com/1/indexes/*/queries?" + params, { method: "POST", headers: headers, body: JSON.stringify(request)});
    if(!response) {
      MouApplication.logError(MouGameIconsClient.APP_NAME, "Invalid (empty) response from server game-icons.net (algolianet)")
      return null
    }

    return response
  }

  
  /**
   * Retrieves the count of icons from the server.
   * 
   * This method first checks if the icon count is already cached. If so, it returns the cached value.
   * Otherwise, it queries the server to get the count of icons.
   * 
   * @returns {Promise<number>} A promise that resolves to the number of icons. Returns 0 if the server response is invalid or if there are no icons.
   */
  static async getIconsCount(): Promise<number> {
    // return cached value
    if(MouGameIconsClient.ICONS_COUNT > 0) {
      return MouGameIconsClient.ICONS_COUNT
    }
    const response = await MouGameIconsClient.queryServer(" ", 1, 0)
    if(!response) return 0
    const res = await response.json()
    if(res && res.results && res.results[0] && res.results[0].nbHits) {
      MouGameIconsClient.ICONS_COUNT = res.results[0].nbHits
      return res.results[0].nbHits
    }
    return 0
  }

  /**
   * Search for icons on Game-Icons.net
   */
  static async searchIcons(terms: string, page: number): Promise<{ icons: MouGameIcon[], count: number }> {
    if(terms && terms.length > 2) {
      MouApplication.logInfo(MouGameIconsClient.APP_NAME, "Searching ... " + terms)
      const response = await MouGameIconsClient.queryServer(encodeURI(terms), MouBrowser.PAGE_SIZE, page)
      if(!response) return { icons: [], count: 0 }
      
      const results = [] as MouGameIcon[]
      const res = await response.json()
      res.results[0].hits.forEach( (r : AnyDict) => {
        results.push({
          id: r.id,
          author: MouGameIconsClient.extractTextFromHTML(r.id.split('/')[1].replace("-", " ").replace(/(^\w{1})|(\s+\w{1})/g, (letter : string) => letter.toUpperCase())),
          name: r.name,
          desc: MouGameIconsClient.extractTextFromHTML(r.content),
          url: `https://game-icons.net/icons/ffffff/000000/${r.id}.svg`,
        })
      })
      return { icons: results, count: res.results[0].nbHits }
    }
  
    return { icons: [], count: 0 }
  }

  /**
   * Downloads an icon from Game-Icons.net
   */
  static async downloadIcon(iconUri: string, fgColor: string, bgColor: string): Promise<string | null> {
    // check colors
    let re = /#[\da-f]{6}/;
    if(fgColor && !re.test(fgColor)) {
      ui.notifications?.error((game as Game).i18n.format("MOU.error_invalid_color", { format: fgColor }))
      return null
    } else if (bgColor && !re.test(bgColor)) {
      ui.notifications?.error((game as Game).i18n.format("MOU.error_invalid_color", { format: bgColor }))
      return null
    }
        
    const headers = { method: "POST", headers: { 'Accept': 'application/json', 'Content-Type': 'application/json'}, body: JSON.stringify({ url: iconUri }) }
    const response = await fetch(`${MOU_API}/gameicons/download`, headers).catch(function(e) {
      console.error(`Moulinette GameIcons | Cannot download image ${iconUri}`, e)
    });
    if(!response) return null

    let svg = await response.text()
    let imageName = iconUri.split('/').pop() + ".svg"

    if(fgColor != "#ffffff" || bgColor != "#000000") {
      fgColor = fgColor ? fgColor : "transparent"
      bgColor = bgColor ? bgColor : "transparent"
      svg = svg.replace(`fill="#fff"`, `fill="${fgColor}"`).replace(`<path d=`, `<path fill="${bgColor}" d=`)
      imageName = iconUri.split('/').pop() + `-${fgColor}-${bgColor}.svg`
    }

    // fix for Firefox users => add widths
    svg = svg.replace("<svg", `<svg width="512" height="512"`)

    // upload file to FVTT server
    const result = await MouFileManager.uploadFile(
      new File([svg], imageName.replaceAll("#", "C"), { type: "image/svg+xml", lastModified: new Date().getTime() }), 
      imageName, 
      `${MouConfig.MOU_DEF_FOLDER}/gameicons`)
    return result ? result.path : null
  }
}