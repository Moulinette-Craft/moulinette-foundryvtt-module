import MouApplication from "../../apps/application";
import { MODULE_ID } from "../../constants";
import MouMediaUtils from "../../utils/media-utils";
import { LocalCollectionSource } from "./collection-local-index-config";

/**
 * This class is responsible for configuring local collections.
 * It extends the MouApplication class and provides functionality
 * to manage the configuration of local collection sources, including
 * setting the source path, name, and options such as thumbnails and metadata.
 */
export default class LocalCollectionConfigNewSource extends MouApplication {
 
  override APP_NAME = "LocalCollectionConfigNewSource"

  //private html?: JQuery<HTMLElement>;
  private callback: Function;
  private source: LocalCollectionSource

  constructor(callback: Function, source?: LocalCollectionSource) {
    super();
    this.callback = callback;
    if(source) {
      this.source = source
    } else {
      this.source = {
        name: null,
        path: null,
        source: null,
        assets: -1,
        options: {
          thumbs: false,
          metadata: false,
        }
      }
    }
  }

  /**
   * Retrieves the localized title for the local collection configuration source.
   *
   * @override
   * @returns {string} The localized title string.
   */
  override get title(): string {
    return (game as Game).i18n.localize("MOU.localcollection_config_source");
  }

  static override get defaultOptions(): ApplicationOptions {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "mou-local-config-source",
      classes: ["mou"],
      template: `modules/${MODULE_ID}/templates/config-local-collection-source.hbs`,
      width: 600,
      height: "auto"
    }) as ApplicationOptions;
  }

  override async getData() {
    return {
      source: this.source
    };
  }

  override activateListeners(html: JQuery<HTMLElement>): void {
    super.activateListeners(html);
    html.find("button").on("click", this._onAction.bind(this))
    html.find("input").on("change", this._onInputChange.bind(this))
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
      const parent = this
      const button = $(event.currentTarget)
      if(button.data("id") == "folder") {
        new FilePicker({
          type: "folder",
          // @ts-ignore
          callback: async (path, picker) => {
            parent.source.path = path
            parent.source.source = picker.activeSource
            parent.source.name = MouMediaUtils.prettyMediaName(path.split("/").pop())
            parent.render()
          },
        // @ts-ignore
        }).browse()
      } else if(button.data("id") == "save") {
        if(!this.source.name || this.source.name.length == 0) return ui.notifications?.error((game as Game).i18n.localize("MOU.error_source_name"))
        if(!this.source.path || this.source.path.length == 0) return ui.notifications?.error((game as Game).i18n.localize("MOU.error_source_folder"))
        this.callback(this.source)
        this.close()
      } else if(button.data("id") == "cancel") {
        this.close()
      } else {}
    }
  }

  /**
   * Handles the input change event for the collection local index configuration source.
   * 
   * @param event - The input change event.
   */
  _onInputChange(event: Event): void {
    event.preventDefault();
    if(event.currentTarget) {
      const input = $(event.currentTarget)
      switch(input.attr('name')) {
        case "name":
          this.source.name = input.val() as string
          break
        case "thumbnails":
          this.source.options.thumbs = input.is(':checked')
          break
        case "metadata":
          this.source.options.metadata = input.is(':checked')
          break
      }
    }
  }
}