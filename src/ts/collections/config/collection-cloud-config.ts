import MouApplication from "../../apps/application";
import { MODULE_ID, SETTINGS_COLLECTION_CLOUD } from "../../constants";
import { AnyDict } from "../../types";
import { CloudMode } from "../collection-cloud-base";

/**
 * This class for configuring cloud collection
 */
export default class CloudCollectionConfig extends MouApplication {

  override APP_NAME = "CloudCollectionConfig"

  private html?: JQuery<HTMLElement>;
  private callback: Function;

  static DEFAULT_OPTIONS = {
    id: "mou-cloud-config",
    classes: ["mou"],
    position: {
      width: 500,
      height: "auto"
    }
  }

  static PARTS = {
    content: { template: `modules/${MODULE_ID}/templates/config-cloud-collection.hbs` }
  }

  constructor(callback: Function) {
    super();
    this.callback = callback;
  }

  get title(): string {
    return (game as Game).i18n!.localize("MOU.cloudcollection_config");
  }

  async _prepareContext(_options: AnyDict) {
    const settings = MouApplication.getSettings(SETTINGS_COLLECTION_CLOUD) as AnyDict
    const mode = "mode" in settings ? settings.mode : CloudMode.ALL_ACCESSIBLE

    return {
      mode: mode,
      modes: [
        { id: CloudMode.ONLY_SUPPORTED_CREATORS, name: (game as Game).i18n!.localize("MOU.mode_supported"), desc: (game as Game).i18n!.localize("MOU.mode_supported_desc")},
        { id: CloudMode.ALL_ACCESSIBLE, name: (game as Game).i18n!.localize("MOU.mode_accessible"), desc: (game as Game).i18n!.localize("MOU.mode_accessible_desc")},
        //{ id: CloudMode.ALL, name: (game as Game).i18n!.localize("MOU.mode_all"), desc: (game as Game).i18n!.localize("MOU.mode_all_desc")},
      ]
    };
  }

  /**
   * V2: activateListeners(html) is replaced by _onRender(context, options).
   */
  async _onRender(context: AnyDict, options: AnyDict): Promise<void> {
    await super._onRender(context, options)
    const html = $((this as AnyDict).element as HTMLElement)
    html.find("footer button").on("click", this._onAction.bind(this))
    this.html = html
  }

  /** Extend/collapse filter section */
  async _onAction(event: Event): Promise<void> {
    event.preventDefault();
    if(event.currentTarget) {
      const button = $(event.currentTarget)
      if(button.data("id") == "save") {
        const id = this.html?.find('input[name=mode]:checked').attr('id')
        if(id &&  Object.values(CloudMode).includes(id as CloudMode)) {
          const settings = MouApplication.getSettings(SETTINGS_COLLECTION_CLOUD) as AnyDict
          settings.mode = id
          await MouApplication.setSettings(SETTINGS_COLLECTION_CLOUD, settings)
          this.logInfo("Moulinette Cloud configurations successfully updated!")
        }
      }
    }
    this.close()
    this.callback()
  }

}
