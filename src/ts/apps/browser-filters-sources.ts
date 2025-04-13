import { MODULE_ID, SETTINGS_HIDDEN } from "../constants.js";
import { AnyDict } from "../types.js";
import MouApplication from "./application.js";

export default class MouBrowserFiltersSources extends MouApplication {
  
  static override APP_NAME = "MouBrowserFiltersSources"
  override APP_NAME = MouBrowserFiltersSources.APP_NAME

  private sources: any[];
  private description: string;
  private callback?: Function;

  constructor(sources : any[], descr: string, callback?: Function) {
    super({})
    this.sources = sources;
    this.description = descr;
    this.callback = callback;
  }
  
  static override get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "mou-filters-sources",
      classes: ["mou"],
      title: (game as Game).i18n.localize("MOU.browser_filters_visibility"),
      template: `modules/${MODULE_ID}/templates/browser-filters-sources.hbs`,
      width: 400,
      height: "auto",
      closeOnSubmit: true,
      submitOnClose: false,
    });
  }
  
  override getData() {
    const disabled = MouApplication.getSettings(SETTINGS_HIDDEN) as AnyDict
    return { 
      sources: this.sources.map((s) => { return { 
        id: s.id, 
        name: s.name, 
        desc: s.desc,
        disabled: disabled[s.id] ?? false,
      }}),
      description: this.description, 
      disabled: disabled
    }
  }

  override activateListeners(html: JQuery<HTMLElement>) {
    super.activateListeners(html);
    this.bringToTop()
    html.find("button").on("click", (ev) => {
      const actionId = ev.currentTarget.dataset.id;
      if(actionId == "save") {
        const disabled = MouApplication.getSettings(SETTINGS_HIDDEN) as AnyDict
        this.sources.forEach((s) => {
          const checkbox = html.find(`input[id="enabled-${s.id}"]`)[0] as HTMLInputElement;
          if (checkbox && !checkbox.checked) {
            disabled[s.id] = true;
          } else {
            if (disabled[s.id]) {
              delete disabled[s.id];
            }
          }
        });
        MouApplication.setSettings(SETTINGS_HIDDEN, disabled);
      }
      this.close();
      if (this.callback) {
        this.callback();
      }
    });
  }
  

    
}
