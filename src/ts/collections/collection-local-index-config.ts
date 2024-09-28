import MouApplication from "../apps/application";
import MouLocalClient from "../clients/moulinette-local";
import MouConfig, { MODULE_ID, SETTINGS_COLLECTION_LOCAL } from "../constants";
import { AnyDict } from "../types";
import MouFileManager from "../utils/file-manager";
import LocalCollectionConfigNewSource from "./collection-local-index-config-source";

export interface LocalCollectionSource {
  id?: string,
  name: string | null,
  path: string | null,
  source: string | null,
  assets: number
  options: {
    thumbs: boolean,
    metadata: boolean
  }
}

/**
 * This class for configuring local collections
 */
export default class LocalCollectionConfig extends MouApplication {
 
  override APP_NAME = "LocalCollectionConfig"

  //private html?: JQuery<HTMLElement>;
  private advanced: boolean;
  private callback: Function;
  private indexAll: boolean;

  constructor(callback: Function) {
    super();
    this.callback = callback;
    this.advanced = false;
    this.indexAll = false
  }

  override get title(): string {
    return (game as Game).i18n.localize("MOU.localcollection_config");
  }

  static override get defaultOptions(): ApplicationOptions {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "mou-local-config",
      classes: ["mou"],
      template: `modules/${MODULE_ID}/templates/config-local-collection.hbs`,
      width: 800,
      height: "auto"
    }) as ApplicationOptions;
  }

  override async getData() {
    const settings = MouApplication.getSettings(SETTINGS_COLLECTION_LOCAL) as AnyDict
    let folders = null
    if(settings.folders && settings.folders.length > 0) {
      folders = settings.folders as AnyDict
    }
    const indexingRequired = folders?.find((f: LocalCollectionSource) => f.assets == 0) != null
    return {
      folders,
      indexingRequired,
      advanced: this.advanced
    };
  }

  override activateListeners(html: JQuery<HTMLElement>): void {
    super.activateListeners(html);
    html.find(".cfg-actions a").on("click", this._onFolderAction.bind(this))
    html.find("footer button").on("click", this._onAction.bind(this))
    html.find(".more a").on("click", this._onToggleAvancedOptions.bind(this))
    //this.html = html
  }

  async _onFolderAction(event: Event): Promise<void> {
    event.preventDefault();
    const parent = this
    if(event.currentTarget) {
      const idx = $(event.currentTarget).closest(".cfg-folder").data("idx")
      const actionId = $(event.currentTarget).data("id")
      const settings = MouApplication.getSettings(SETTINGS_COLLECTION_LOCAL) as AnyDict
      if(actionId && settings.folders && idx >= 0 && idx < settings.folders.length) {
        const folder = settings.folders[idx]
        if(actionId == "delete") {
          Dialog.confirm({
            title: (game as Game).i18n.localize("MOU.confirm_delete_source"),
            content: (game as Game).i18n.format("MOU.confirm_delete_source_note", {folder: folder.name}),
            yes: async function() {
              settings.folders.splice(idx, 1)
              await MouApplication.setSettings(SETTINGS_COLLECTION_LOCAL, settings)
              parent.render()
            },
            no: () => {}
          });
        } else if (actionId == "scan") {
          MouLocalClient.indexAllLocalAssets(folder.path, folder.source, this._callbackAfterIndexing.bind(parent), folder.options)
        } else if (actionId == "reindex") {
          MouLocalClient.indexAllLocalAssets(folder.path, folder.source, this._callbackAfterIndexing.bind(parent), folder.options, true)
        } else if (actionId == "edit") {
          const newSourceUI = new LocalCollectionConfigNewSource(this._callbackAfterNewSource.bind(this), folder)
          newSourceUI.render(true)
        }
      }
    }
  }
  
  /**
   * Show/hide advanced options
   */
  async _onToggleAvancedOptions(event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    this.advanced = !this.advanced
    this.render()
  }

  
  /**
   * Indexes the next folder in the local collection settings that has not yet been indexed.
   * 
   * This method retrieves the local collection settings and iterates through the folders.
   * If a folder has not been indexed (i.e., `assets` is 0) and has a valid path and source,
   * it triggers the indexing process for that folder using `MouLocalClient.indexAllLocalAssets`.
   * 
   * @remarks
   * The indexing process is asynchronous and uses a callback function `_callbackAfterIndexing`
   * to handle post-indexing operations. If indexAll is set to true, `_callbackAfterIndexing` will
   * trigger the indexing of the next folder in the collection.
   * 
   * @returns {void}
   */
  indexNextFolder(): void {
    const settings = MouApplication.getSettings(SETTINGS_COLLECTION_LOCAL) as AnyDict
    if(settings.folders) {
      for(const folder of settings.folders) {
        const source = (folder as LocalCollectionSource)
        if(source.assets == 0 && source.path && source.source) {
          MouLocalClient.indexAllLocalAssets(source.path, source.source, this._callbackAfterIndexing.bind(this), source.options)
          return
        }
      }
    }
    this.indexAll = false;
    this.render()
  }

  async _onAction(event: Event): Promise<void> {
    event.preventDefault();
    const parent = this
    if(event.currentTarget) {
      const button = $(event.currentTarget)
      if(button.data("id") == "add-folder") {
        const newSourceUI = new LocalCollectionConfigNewSource(this._callbackAfterNewSource.bind(this))
        newSourceUI.render(true)
      } else if(button.data("id") == "index-folders") {
        this.indexAll = true
        this.indexNextFolder()
      } else if(button.data("id") == "delete-index") {
        Dialog.confirm({
          title: (game as Game).i18n.localize("MOU.confirm_delete_index"),
          content: (game as Game).i18n.localize("MOU.confirm_delete_index_note"),
          yes: async function() {
            await MouFileManager.storeJSON({}, MouLocalClient.INDEX_LOCAL_ASSETS, MouConfig.MOU_DEF_FOLDER)
            const settings = MouApplication.getSettings(SETTINGS_COLLECTION_LOCAL) as AnyDict
            if(settings.folders) {
              for(const folder of settings.folders) {
                (folder as LocalCollectionSource).assets = 0
              }
              await MouApplication.setSettings(SETTINGS_COLLECTION_LOCAL, settings)
            }
            ui.notifications?.info((game as Game).i18n.localize("MOU.index_deleted"))
            parent.render()
          },
          no: () => {}
        });
      }
    }
  }

  /**
   * When source modified or added, this method stores the settings and updates itself
   */
  _callbackAfterNewSource(source: LocalCollectionSource): void {
    const parent = this
    
    if(!source) return;
    const settings = MouApplication.getSettings(SETTINGS_COLLECTION_LOCAL) as AnyDict
    if(source.id && settings.folders) {
      for(let i=0; i<settings.folders.length; i++) {
        if(settings.folders[i].id == source.id) {
          settings.folders[i] = source
        }
      }
    }
    else {
      source.id = foundry.utils.randomID(10)
      if(!settings.folders) {
        settings.folders = [source]
      } else {
        settings.folders.push(source)
      }
    }
    MouApplication.setSettings(SETTINGS_COLLECTION_LOCAL, settings).then(() => {
      parent.render()
    })
  }

  /**
   * This method is called after indexing completes
   * Updates the number of assets
   */
  async _callbackAfterIndexing(path: string, source: string, assetsCount: number): Promise<void> {
    const settings = MouApplication.getSettings(SETTINGS_COLLECTION_LOCAL) as AnyDict
    if(settings.folders) {
      const folder : LocalCollectionSource = settings.folders.find((f: LocalCollectionSource) => f.path == path && f.source == source)
      if(folder) {
        folder.assets = assetsCount
        ui.notifications?.info((game as Game).i18n.format("MOU.index_completed", {path: path}))
        this.advanced = false
        await MouApplication.setSettings(SETTINGS_COLLECTION_LOCAL, settings)
        if(this.indexAll) {
          this.indexNextFolder()
        } else {
          this.render()
        }
      }
    }
  }

  override async close(options?: Application.CloseOptions): Promise<void> {
    super.close(options)
    this.callback()
  }
}