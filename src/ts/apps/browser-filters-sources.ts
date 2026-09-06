import { MODULE_ID, SETTINGS_HIDDEN } from "../constants.js";
import { AnyDict } from "../types.js";
import MouApplication from "./application.js";

export default class MouBrowserFiltersSources extends MouApplication {

  static override APP_NAME = "MouBrowserFiltersSources"
  override APP_NAME = MouBrowserFiltersSources.APP_NAME

  private sources: any[];
  private description: string;
  private callback?: Function;

  static DEFAULT_OPTIONS = {
    id: "mou-filters-sources",
    classes: ["mou"],
    window: {
      title: "MOU.browser_filters_visibility"
    },
    position: {
      width: 400,
      height: "auto"
    }
  }

  static PARTS = {
    content: { template: `modules/${MODULE_ID}/templates/browser-filters-sources.hbs` }
  }

  constructor(sources : any[], descr: string, callback?: Function) {
    super({})
    this.sources = sources;
    this.description = descr;
    this.callback = callback;
  }

  async _prepareContext(_options: AnyDict) {
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

  /**
   * V2: activateListeners(html) is replaced by _onRender(context, options).
   */
  async _onRender(context: AnyDict, options: AnyDict) {
    await super._onRender(context, options)
    ;(this as AnyDict).bringToFront()
    const html = $((this as AnyDict).element as HTMLElement)
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
