import { MODULE_ID, SETTINGS_TOKEN_SELECTOR } from "../constants.js";
import { AnyDict } from "../types.js";
import MouFoundryUtils from "../utils/foundry-utils.js";
import MouApplication from "./application.js";

export default class MouBrowserTokenSelector extends MouApplication {
  
  static override APP_NAME = "MouBrowserTokenSelector"
  override APP_NAME = MouBrowserTokenSelector.APP_NAME

  private data: any;
  private html?: JQuery<HTMLElement>;

  constructor(data : AnyDict) {
    super({})
    this.data = data;
  }
  
  static override get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "mou-browser-token-selector",
      classes: ["mou"],
      title: (game as Game).i18n.localize("MOU.drop_as_token"),
      template: `modules/${MODULE_ID}/templates/browser-token-selector.hbs`,
      width: 680,
      height: "auto",
      closeOnSubmit: true,
      submitOnClose: false,
    });
  }
  
  override getData() {
    const settings = MouApplication.getSettings(SETTINGS_TOKEN_SELECTOR) as AnyDict
    const actorId = settings.actorId || null
    const actorType = settings.actorType || null

    const actors = (game as Game).actors?.map( a => { return { id: a.id, name: a.name, selected: a.id == actorId } })
    let actorTypes = []
    actorTypes = Object.keys((game as Game).system.documentTypes.Actor).map( a => { 
      const label = CONFIG.Actor.typeLabels[a] || a;
      return { id: a, name: (game as Game).i18n.localize(label) , selected: a == actorType } 
    })
    
    return { actors: actors, actorTypes: actorTypes, actorId: actorId, actorType: actorType }
  }

  override activateListeners(html: JQuery<HTMLElement>) {
    super.activateListeners(html);
    this.bringToTop()
    this.html = html
    html.find(".actions button").on("click", this._onAction.bind(this))
  }
  
  async _onAction(event: Event) {
    event.preventDefault();
    const source = $(event.currentTarget as HTMLElement).data("id");
    
    const actorType = this.html?.find(".actorsTypes").children("option:selected").val() as string
    const selActorId = this.html?.find(".actors").children("option:selected").val() as string
    const selActor = (game as Game).actors?.has(selActorId) ? (game as Game).actors?.get(selActorId) : null

    // store settings
    MouApplication.setSettings(SETTINGS_TOKEN_SELECTOR, {
      actorId: selActorId,
      actorType: actorType
    })

    switch(source) {
      case "new":
      case "new-linked":
        const folderPath = this.data.folder 
        const newActor = await MouFoundryUtils.createActor(this.data.path, actorType, folderPath)
        MouFoundryUtils.createToken(this.data.canvas, newActor, this.data.path, source == "new-linked", this.data.position)
        break
      case "existing":
      case "existing-linked":
        MouFoundryUtils.createToken(this.data.canvas, selActor, this.data.path, source == "existing-linked", this.data.position)  
        break
    }

    this.close()
  }
  
  
}
