import MouApplication from "../../apps/application";
import { MODULE_ID } from "../../constants";
import { AnyDict } from "../../types";
import { LocalCollectionSource } from "./collection-local-index-config";

export default class LocalCollectionConfigPredefined extends MouApplication {
 
  override APP_NAME = "LocalCollectionConfigPredefined"

  //private html?: JQuery<HTMLElement>;
  private callback: Function;
  private predefinedSources: AnyDict;
  
  constructor(callback: Function) {
    super();
    this.callback = callback;

    this.predefinedSources = [
      {
        id: "fvtt_core_icons", labelKey: "MOU.predefined_fvtt_core_icons", descriptionKey: "MOU.predefined_fvtt_core_icons_desc",
        name: "FoundryVTT Icons",
        source: "public",
        path: "icons",
        options: { "thumbs": false, "metadata": false }
      },
      {
        id: "dnd5e_icons", labelKey: "MOU.predefined_dnd5e_icons", descriptionKey: "MOU.predefined_dnd5e_icons_desc",
        name: "DnD5e Icons",
        source: "data",
        path: "systems/dnd5e/icons",
        options: { "thumbs": false, "metadata": false }
      },
      {
        id: "pf2_icons", labelKey: "MOU.predefined_pf2e_icons", descriptionKey: "MOU.predefined_pf2e_icons_desc",
        name: "PF2e Icons",
        source: "data",
        path: "systems/pf2e/icons",
        options: { "thumbs": false, "metadata": false }
      }
    ]
  }

  /**
   * Retrieves the localized title for the local collection configuration source.
   *
   * @override
   * @returns {string} The localized title string.
   */
  override get title(): string {
    return (game as Game).i18n!.localize("MOU.localcollection_predefined");
  }

  static override get defaultOptions(): Application.Options {
    return (foundry.utils as AnyDict).mergeObject(super.defaultOptions, {
      id: "mou-local-config-source",
      classes: ["mou"],
      template: `modules/${MODULE_ID}/templates/config-local-collection-predefined.hbs`,
      width: 600,
      height: "auto"
    }) as Application.Options;
  }

  override async getData() {
    return {
      "predefinedSources": this.predefinedSources
    }
  }

  override activateListeners(html: JQuery<HTMLElement>): void {
    super.activateListeners(html);
    html.find("a").on("click", this._onAction.bind(this))
    //this.html = html
  }

  /**
   * Handles action events triggered by user interactions.
   * 
   * @param event - The event object representing the user interaction.
   * 
   * This method performs different actions based on the data-id attribute of the event's current target:
   * - "folder": Opens a FilePicker to select a folder and updates the source path, source, and name.
   * - "save": Validates the source name and path, then calls the callback function with the source and closes the dialog.
   * - "cancel": Closes the dialog without performing any action.
   * 
   * If the source name or path is invalid when attempting to save, an error notification is displayed.
   */
  _onAction(event: Event): void {
    event.preventDefault();
    if(event.currentTarget) {
      const link = $(event.currentTarget)
      const predefined = this.predefinedSources.find((source: AnyDict) => source.id === link.data("id"))
      const predefined_browse = this.predefinedSources.find((source: AnyDict) => `${source.id}_browse` === link.data("id"))
      if(predefined) {
        const source = {
          name: predefined.name,
          path: predefined.path,
          source: predefined.source,
          options: predefined.options,
          assets: -1,
        } as LocalCollectionSource
        this.callback(source)
        this.close()
      } else if(predefined_browse) {
        const FilePickerImpl: any = (foundry.applications.apps.FilePicker as AnyDict).implementation;
        new FilePickerImpl({
          type: "folder",
          current: predefined_browse.path
        }).render(true)
      }
    }
  }

}