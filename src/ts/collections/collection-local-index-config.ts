import MouApplication from "../apps/application";
import MouLocalClient from "../clients/moulinette-local";
import { MODULE_ID, SETTINGS_COLLECTION_LOCAL } from "../constants";
import { AnyDict } from "../types";

/**
 * This class for configuring local collections
 */
export default class LocalCollectionConfig extends MouApplication {
 
  override APP_NAME = "LocalCollectionConfig"

  private html?: JQuery<HTMLElement>;
  private callback: Function;

  constructor(callback: Function) {
    super();
    this.callback = callback;
  }

  override get title(): string {
    return (game as Game).i18n.localize("MOU.localcollection_config");
  }

  static override get defaultOptions(): ApplicationOptions {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "mou-local-config",
      classes: ["mou"],
      template: `modules/${MODULE_ID}/templates/config-local-collection.hbs`,
      width: 600,
      height: "auto"
    }) as ApplicationOptions;
  }

  override async getData() {
    const settings = MouApplication.getSettings(SETTINGS_COLLECTION_LOCAL) as AnyDict
    let folders = null
    if(settings.folders && settings.folders.length > 0) {
      folders = settings.folders as AnyDict
    }
    return {
      folders
    };
  }

  override activateListeners(html: JQuery<HTMLElement>): void {
    super.activateListeners(html);
    html.find(".cfg-actions a").on("click", this._onFolderAction.bind(this))
    html.find("footer button").on("click", this._onAction.bind(this))
    this.html = html
    console.log(this.html)
  }

  async _onFolderAction(event: Event): Promise<void> {
    event.preventDefault();
    if(event.currentTarget) {
      const idx = $(event.currentTarget).closest(".cfg-folder").data("idx")
      const actionId = $(event.currentTarget).data("id")
      const settings = MouApplication.getSettings(SETTINGS_COLLECTION_LOCAL) as AnyDict
      if(actionId && settings.folders && idx >= 0 && idx < settings.folders.length) {
        const folder = settings.folders[idx]
        if(actionId == "delete") {
          settings.folders.splice(idx, 1)
          await MouApplication.setSettings(SETTINGS_COLLECTION_LOCAL, settings)
          this.render()
        } else if (actionId == "reindex") {
          MouLocalClient.indexAllLocalAssets(folder.path, folder.source)
        } else if (actionId == "edit") {
          console.log("EDIT")
        }
      }
    }
  }
  
  async _onAction(event: Event): Promise<void> {
    event.preventDefault();
    if(event.currentTarget) {
      const parent = this
      const button = $(event.currentTarget)
      if(button.data("id") == "add-folder") {
        new FilePicker({
          type: "folder",
          // @ts-ignore
          callback: async (path, picker) => {
            const folder = {
              path: path,
              source: picker.activeSource
            }
            const settings = MouApplication.getSettings(SETTINGS_COLLECTION_LOCAL) as AnyDict
            if(!settings.folders) {
              settings.folders = [folder]
            } else {
              settings.folders.push(folder)
            }
            await MouApplication.setSettings(SETTINGS_COLLECTION_LOCAL, settings)
            parent.render()
          },
        // @ts-ignore
        }).browse()
      }
    }
  }

  

  override async close(options?: Application.CloseOptions): Promise<void> {
    super.close(options)
    this.callback()
  }
}