import { MODULE_ID, MOU_STORAGE_PUB } from "../constants";
import { AnyDict } from "../types";
import MouMediaUtils from "../utils/media-utils";
import MouApplication from "./application";


export default class MouBrowser extends MouApplication {
  
  override APP_NAME = "MouBrowser"
  
  private html?: JQuery<HTMLElement>;
  private filters_prefs:AnyDict = {
    visible: true,
    opensections: { collection: true, asset_type: true, creator: false },
    collection: "cloud",
    focus: "search"
  }
  private filters = {
    type: "map",
    creator: "",
    pack: 0
  }

  override get title(): string {
    return (game as Game).i18n.localize("MOU.browser");
  }

  static override get defaultOptions(): ApplicationOptions {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "mou-browser",
      classes: ["mou"],
      template: `modules/${MODULE_ID}/templates/browser.hbs`,
      width: 1250,
      height: 1000,
      resizable: true
    }) as ApplicationOptions;
  }

  override async getData() {
    const assets = await this.getModule().cloudclient.randomAssets(this.filters)
    MouMediaUtils.prettyMediaNames(assets)

    const creators = await this.getModule().cloudclient.getCreators()
    const packs = this.filters.creator ? await this.getModule().cloudclient.getPacks(this.filters.creator) : null

    return {
      previewBaseURL: MOU_STORAGE_PUB,
      assets: assets,
      filters: {
        prefs: this.filters_prefs,
        values: this.filters,
        creators: creators,
        packs: packs
      }
    };
  }

  override activateListeners(html: JQuery<HTMLElement>): void {
    super.activateListeners(html);
    this.html = html
    html.find(".filters h2")
      .on("click", this._onClickFilterSection.bind(this));
    html.find(".filters-toggle")
      .on("click", this._onClickFiltersToggle.bind(this));
    html.find(".filters input")
      .on("click", this._onClickFilters.bind(this));
    html.find(".filters select")
      .on("change", this._onSelectFilters.bind(this));

    switch(this.filters_prefs.focus) {
      case "search": this.html.find(".searchbar input").trigger("focus"); break
      case "creator": this.html.find("#creator-select").trigger("focus"); break
      case "pack": this.html.find("#pack-select").trigger("focus"); break
      default:
    }
  }

  /** Extend/collapse filter section */
  async _onClickFilterSection(event: Event): Promise<void> {
    event.preventDefault();
    if(event.currentTarget) {
      const section = $(event.currentTarget)
      const id = section.data("id")
      if(id) {
        const filter = this.html?.find(`div[data-id='${id}']`)
        const icon = section.find('i')
        if(filter && icon) {
          filter.toggleClass("collapsed")
          icon.attr('class', icon.hasClass("fa-square-minus") ? "fa-regular fa-square-plus" : "fa-regular fa-square-minus")
          this.filters_prefs.opensections[id] = icon.hasClass("fa-square-minus")
        }
      }
    }
  }

  /** Drop-down list selection (creator/packs) */
  async _onSelectFilters(event: Event): Promise<void> {
    event.preventDefault();
    if(event.currentTarget) {
      const combo = $(event.currentTarget)
      if(combo.attr('id') == "creator-select") {
        this.filters.creator = String(combo.val());
        this.filters.pack = 0
        this.filters_prefs.focus = "creator"
      } else if(combo.attr('id') == "pack-select") {
        this.filters.pack = Number(combo.val());
        this.filters_prefs.focus = "pack"
      }
      
      this.render()
    }
  }

  /** Show/hide filters */
  async _onClickFiltersToggle(event: Event): Promise<void> {
    event.preventDefault();
    if(event.currentTarget) {
      const toggle = $(event.currentTarget)
      const filters = this.html?.find(`.filters`)
      if(filters) {
        filters.toggleClass("collapsed")
        toggle.toggleClass("collapsed")
        toggle.find("i")?.attr('class', filters.is(":visible") ? "fa-solid fa-angles-left" : "fa-solid fa-angles-right")
        this.filters_prefs.visible = filters.is(":visible")
      }
    }
  }

  /** Filter interactions */
  async _onClickFilters(): Promise<void> {
    this.filters_prefs.collection = this.html?.find('.filters input[name=collection]:checked').attr('id')
    const type = this.html?.find('.filters input[name=asset_type]:checked').attr('id')
    this.filters.type = type ? type : "scene"
    this.render()
  }
}
  
