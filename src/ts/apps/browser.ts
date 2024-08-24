import MouCloudClient from "../clients/moulinette-cloud";
import { moduleId, MOU_STORAGE_PUB } from "../constants";
import MouMediaUtils from "../utils/media-utils";

export default class MouBrowser extends Application {
  
  private assetType = "scene";
  private html?: JQuery<HTMLElement>;

  override get title(): string {
    return (game as Game).i18n.localize("MOU.browser");
  }

  static override get defaultOptions(): ApplicationOptions {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "mou-browser",
      classes: ["mou"],
      template: `modules/${moduleId}/templates/browser.hbs`,
      width: 1250,
      height: 1000,
      resizable: true
    }) as ApplicationOptions;
  }

  override async getData() {
    const client = new MouCloudClient()
    
    const assets = await client.randomAssets(this.assetType)
    MouMediaUtils.prettyMediaNames(assets)

    return {
      previewBaseURL: MOU_STORAGE_PUB,
      assets: assets,
      art: this.assetType
    };
  }

  override activateListeners(html: JQuery<HTMLElement>): void {
    super.activateListeners(html);
    this.html = html
    html
      .find(".filters h2")
      .on("click", this._onClickFilterSection.bind(this));
    html
      .find(".filters-toggle")
      .on("click", this._onClickFiltersToggle.bind(this));
    html
      .find(".filters input")
      .on("click", this._onClickFilters.bind(this));
  }

  /** Extend/collapse filter section */
  async _onClickFilterSection(event: Event): Promise<void> {
    event.preventDefault();
    if(event.currentTarget) {
      const section = $(event.currentTarget)
      const id = section.data("id")
      if(id) {
        const filter = this.html?.find(`ul[data-id='${id}']`)
        const icon = section.find('i')
        if(filter && icon) {
          filter.toggleClass("collapsed")
          icon.attr('class', icon.hasClass("fa-square-minus") ? "fa-regular fa-square-plus" : "fa-regular fa-square-minus")
        }
      }
    }
  }

  /** Show/hide filters */
  async _onClickFiltersToggle(event: Event): Promise<void> {
    event.preventDefault();
    if(event.currentTarget) {
      const toggle = $(event.currentTarget)
      const filters = this.html?.find(`.filters`)
      if(filters) {
        filters.toggle()
        if(filters.is(":visible")) {
          toggle.css({'left': "295px"})
          toggle.find("i")?.attr('class', "fa-solid fa-angles-left")
        } else {
          toggle.css({'left': "0"})
          toggle.find("i")?.attr('class', "fa-solid fa-angles-right")
        }
      }
    }
  }

  /** filters interaction */
  async _onClickFilters(event: Event): Promise<void> {
    this._refreshAssets()
  }

  async _refreshAssets() {
    const type = this.html?.find('.filters input[name=art]:checked').attr('id')
    this.assetType = type ? type : "scene"
    this.render(true)
    
  }
}
  
