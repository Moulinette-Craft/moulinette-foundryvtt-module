import MouConfig, { MODULE_ID, SETTINGS_PREVS } from "../constants";
import { AnyDict } from "../types";
import MouFileManager from "../utils/file-manager";
import MouMediaUtils from "../utils/media-utils";
import MouApplication from "./application";
import { MouCollection, MouCollectionAsset, MouCollectionAssetTypeEnum, MouCollectionDragData, MouCollectionFilters, MouCollectionUtils } from "./collection";


export default class MouBrowser extends MouApplication {
  
  static override APP_NAME = "MouBrowser"
  override APP_NAME = MouBrowser.APP_NAME

  static PAGE_SIZE = 100
  static DEBOUNCE_TIME = 500 // delay (in ms) before executing search
  
  private html?: JQuery<HTMLElement>;
  private ignoreScroll: boolean = false;
  private page: number = 0; // -1 means = ignore. Otherwise, increments the page and loads more data
  private collection?: MouCollection;
  private currentAssetsCount: number = 0;
  private currentAssets = [] as MouCollectionAsset[];
  private currentFoldersScroll = { top: 0, left: 0 }
  
  /* Filter preferences */
  private filters_prefs:AnyDict | null = null

  /* Filters */
  private filters: MouCollectionFilters = {
    type: MouCollectionAssetTypeEnum.Actor,
    creator: "",
    pack: "",
    searchTerms: "",
    folder: ""
  }

  override get title(): string {
    return (game as Game).i18n.localize("MOU.browser");
  }

  static override get defaultOptions(): ApplicationOptions {
    const options = foundry.utils.mergeObject(super.defaultOptions, {
      id: "mou-browser",
      classes: ["mou"],
      template: `modules/${MODULE_ID}/templates/browser.hbs`,
      resizable: true,
      width: 1250,
      height: 1000
    }) as ApplicationOptions;
    super.adjustPosition(options, MouBrowser.APP_NAME)
    return options
  }

  override async getData() {
    // initialize filter prefs 
    const prevSettings = MouApplication.getSettings(SETTINGS_PREVS) as AnyDict
    if(!this.filters_prefs) {
      if("filterPrefs" in prevSettings) {
        this.filters_prefs = prevSettings["filterPrefs"]
      } else {
        this.filters_prefs = {
          visible: true,
          opensections: { collection: true, asset_type: true, packs: true },
          collection: "mou-compendiums",
          focus: "search"
        }
      }
      if("filters" in prevSettings) {
        this.filters = prevSettings["filters"]
      }
    }

    // check that module and collections are properly loaded
    const module = MouApplication.getModule()
    if(!module || !module.collections || module.collections.length == 0) 
      throw new Error(`${this.APP_NAME} | Module ${MODULE_ID} not found or no collection loaded`);
    // check that selected collection exists
    this.collection = module.collections.find( c => c.getId() == this.filters_prefs!.collection)
    if(!this.collection) {
      throw new Error(`${this.APP_NAME} | Collection ${this.filters_prefs!.collection} couldn't be found!`);
    }
    await this.collection.initialize()

    this.page = 0
    this.currentAssets = []
    const types = await this.collection.getTypes(this.filters)
    const typesObj = types.map( type => ({ id: Number(type.id), name: MouCollectionUtils.getTranslatedType(Number(type.id)), assetsCount: type.assetsCount}))
    typesObj.sort((a, b) => a.name.localeCompare(b.name))
    
    // change type if selected type not available for current collection
    if(!types.find(t => t.id == this.filters.type)) {
      this.filters.type = types.length > 0 ? types[0].id : MouCollectionAssetTypeEnum.Image
    }
    const creators = this.filters.type ? await this.collection.getCreators(this.filters) : null
    let packs = this.filters.type ? await this.collection.getPacks(this.filters) : null
    const folders = await this.collection.getFolders(this.filters);

    // improve folders by removing common path
    const common = MouFileManager.findLongestCommonBase(folders)
    const foldersImproved = folders.map(f => {
      return { id: f, name: common.length > 0 ? f.substring(common.length) : f }
    })

    // sort and filter packs
    if(packs) {
      packs.sort((a, b) => a.name.toLocaleLowerCase().localeCompare(b.name.toLocaleLowerCase()))
      packs = packs.filter(p => p.assetsCount > 0)
      // look for selected pack
      if(this.filters.pack && this.filters.pack.length > 0) {
        for(const pack of packs) {
          if(this.filters.pack.indexOf(pack.id) >= 0) {
            (pack as AnyDict).selected = true
            break;
          }
        }
      }
    }

    // split types into 2 lists
    const middleIndex = Math.ceil(typesObj.length/2);
    const types1 = typesObj.slice(0, middleIndex);
    const types2 = typesObj.slice(middleIndex);
    
    return {
      user: module.cache.user,
      filters: {
        collections: module.collections.map( col => ( {id: col.getId(), name: col.getName(), configurable: col.isConfigurable() } )),
        prefs: this.filters_prefs,
        values: this.filters,
        creators,
        packs,
        folders : foldersImproved,
        types1,
        types2,
        showPacksFilter: (creators && creators.length > 0) || (packs && packs.length > 0)
      }
    };
  }

  override activateListeners(html: JQuery<HTMLElement>): void {
    super.activateListeners(html);
    this.html = html
    html.find(".filters h2")
      .on("click", this._onClickFilterSection.bind(this));
    html.find(".filters .clear a")
      .on("click", this._onClearFilters.bind(this));
    html.find(".filters-toggle")
      .on("click", this._onClickFiltersToggle.bind(this));
    html.find(".filters input[name=collection]")
      .on("click", this._onClickCollection.bind(this));
    html.find(".filters input[name=asset_type]")
      .on("click", this._onClickAssetType.bind(this));
    html.find(".filters select")
      .on("change", this._onSelectFilters.bind(this))
      .on("mousedown", this._onDeselectFilters.bind(this));
    html.find(".content")
      .on('scroll', this._onScroll.bind(this))
    html.find(".filters .action a")
      .on("click", this._onConfigureCollection.bind(this));
    html.find(".filters .folders a")
      .on("click", this._onChooseFolder.bind(this));
    html.find(".filters .folders").scrollTop(this.currentFoldersScroll.top);
    html.find(".filters .folders").scrollLeft(this.currentFoldersScroll.left);
    
    // input triggers searches
    const search = html.find(".search-bar input")
    let typingTimer: ReturnType<typeof setTimeout>;
    search.on('input', () => {
      clearTimeout(typingTimer);
      typingTimer = setTimeout(() => {
        this.filters.searchTerms = search.val() as string
        this.filters_prefs!.focus = "search#" + search.prop("selectionStart")
        this.render()
      }, MouBrowser.DEBOUNCE_TIME);
    });

    search.on('mousedown', this._onClearSearchTerms.bind(this));

    const focus = this.filters_prefs!.focus.split("#")
    switch(focus[0]) {
      case "search": 
        search.trigger("focus"); 
        const searchInput = search.get(0) as HTMLInputElement
        if(focus.length == 1) {
          searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length)
        } else {
          searchInput.setSelectionRange(Number(focus[1]), Number(focus[1]))
        }
        
      break
      case "creator": this.html.find("#creator-select").trigger("focus"); break
      case "pack": this.html.find("#pack-select").trigger("focus"); break
      case "collection": this.html.find(`#filterCollections input[id='${focus[1]}']`).trigger("focus"); break
      case "type": this.html.find(`#filterTypes input[id='${focus[1]}']`).trigger("focus"); break
      default:
    }

    const header = html.closest(".window-app").find(".window-header")
    const help = header.find(".help")
    if(help.length == 0) {
      const helpHTML = $(`<a class="help"><i class="fa-solid fa-up-right-from-square"></i> ${(game as Game).i18n.localize("MOU.help")}</a>`);
      header.find(".close").before(helpHTML)
      header.find(".help").on("click", () => {
        window.open("https://assets.moulinette.cloud/docs", "_blank")
      })
    }

    this.loadMoreAssets()
  }

  /** Load more assets and activate events */
  async loadMoreAssets() {
    if(this.page < 0 || !this.collection) return
    
    let assets: MouCollectionAsset[] = [];
    try {
      assets = await this.collection.getAssets(this.filters, this.page);
      if(this.page == 0) {
        this.currentAssetsCount = await this.collection.getAssetsCount(this.filters)
      }
    } catch (error) {
      this.logError("Error loading assets:", error)
      ui.notifications?.error((game as Game).i18n.localize("MOU.error_loading_assets"));
    }

    // handle collection errors (like server connection errors)
    if(this.collection.getCollectionError()) {
      this.html?.find(".content").append(await renderTemplate(`modules/${MODULE_ID}/templates/browser-error.hbs`, { error: this.collection.getCollectionError() }))
      this.page = -1
      return
    }

    if(assets.length == 0) {
      if(this.page == 0) {
        if(!this.collection.isBrowsable() && (!this.filters.searchTerms || this.filters.searchTerms.length < 3)) {
          this.html?.find(".content").append(await renderTemplate(`modules/${MODULE_ID}/templates/browser-searchrequired.hbs`, {}))
        } else {
          this.html?.find(".content").append(await renderTemplate(`modules/${MODULE_ID}/templates/browser-nomatch.hbs`, {}))
        }
      }
      this.page = -1
      this.logInfo("No more content!")
      return
    } 
    else {
      const index = this.page * MouBrowser.PAGE_SIZE + 1
      this.page++
      let html = ""
      switch(this.filters.type) {
        case MouCollectionAssetTypeEnum.JournalEntry: 
        case MouCollectionAssetTypeEnum.Macro: 
        case MouCollectionAssetTypeEnum.Playlist: 
        case MouCollectionAssetTypeEnum.Audio: 
          html = await renderTemplate(`modules/${MODULE_ID}/templates/browser-assets-rows.hbs`, { MOU_DEF_NOTHUMB: MouConfig.MOU_DEF_NOTHUMB, assets, index })
          break
        default:
          html = await renderTemplate(`modules/${MODULE_ID}/templates/browser-assets-blocks.hbs`, { MOU_DEF_NOTHUMB: MouConfig.MOU_DEF_NOTHUMB, assets, index })
      }
      this.html?.find(".content").append(html)
      Array.prototype.push.apply(this.currentAssets, assets);
    }
    // activate listeners
    this.html?.find(".asset").off()
    this.html?.find(".asset").on("mouseenter", this._onShowMenu.bind(this));
    this.html?.find(".asset").on("mouseleave", this._onHideMenu.bind(this));
    this.html?.find(".asset a.creator").on("click", this._onClickAssetCreator.bind(this));
    this.html?.find(".asset a.pack").on("click", this._onClickAssetPack.bind(this));
    this.html?.find(".asset.draggable").on("dragstart", this._onDragStart.bind(this));
    this.html?.find(".asset video source").on('error', function() {
      const img = new Image();
      img.src = MouConfig.MOU_DEF_NOTHUMB;
      img.classList.add("fallback-image");
      $(this).closest("video").replaceWith(img);
    });

    // show count
    let countHTML = ""
    if(this.currentAssetsCount > 0) {
      countHTML = (game as Game).i18n.format("MOU.asset_count", { 
        count: MouMediaUtils.prettyNumber(this.currentAssets.length, true), 
        total: MouMediaUtils.prettyNumber(this.currentAssetsCount, true) })
    } else {
      countHTML = (game as Game).i18n.format("MOU.asset_count_nototal", { count: MouMediaUtils.prettyNumber(this.currentAssets.length, true) })
    }
    this.html?.find(".count").text(countHTML)
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
          this.filters_prefs!.opensections[id] = icon.hasClass("fa-square-minus")
        }
      }
    }
  }

  
  /**
   * Handles the selection of filters in the browser.
   * 
   * @param event - The event triggered by selecting a filter.
   * @returns A promise that resolves when the filter selection is processed.
   * 
   * This method prevents the default action of the event, updates the current folder scroll position,
   * and sets the appropriate filter based on the selected element's ID. It then re-renders the component.
   * 
   * - If the selected element has an ID of "creator-select", the creator filter is updated.
   * - If the selected element has an ID of "pack-select", the pack filter is updated.
   */
  async _onSelectFilters(event: Event): Promise<void> {
    event.preventDefault();
    if(event.currentTarget) {
      this.currentFoldersScroll = { top: 0, left: 0 }
      this.filters.folder = ""
      const combo = $(event.currentTarget)
      if(combo.attr('id') == "creator-select") {
        this.filters.creator = String(combo.val());
        this.filters.pack = ""
        this.filters_prefs!.focus = "creator"
      } else if(combo.attr('id') == "pack-select") {
        this.filters.pack = String(combo.val());
        this.filters_prefs!.focus = "pack"
      }
      
      this.render()
    }
  }

  
  /**
   * Handles the deselection of filters when a mouse down event occurs.
   * 
   * @param event - The mouse down event triggered by the user.
   * @returns A promise that resolves when the filter deselection is complete.
   * 
   * This method prevents the default action of the event and checks if the right mouse button (button 2) was clicked.
   * If so, it resets the current folder scroll position and clears the relevant filters based on the target element's ID.
   * It then re-renders the component to reflect the changes.
   */
  async _onDeselectFilters(event: JQuery.MouseDownEvent): Promise<void> {
    if(event.button == 2 && event.currentTarget) {
      event.preventDefault();
      this.currentFoldersScroll = { top: 0, left: 0 }
      this.filters.folder = ""
      const combo = $(event.currentTarget)
      if(combo.attr('id') == "creator-select") {
        this.filters.creator = "";
        this.filters.pack = ""
        this.filters_prefs!.focus = "creator"
      } else if(combo.attr('id') == "pack-select") {
        this.filters.pack = "";
        this.filters_prefs!.focus = "pack"
      }
      
      this.render()
    }
  }

  /**
   * Handles the event when the search terms are cleared.
   * This method is triggered by a right-click (mouse button 2) on the event's current target.
   * It prevents the default action, clears the search terms, and re-renders the component.
   *
   * @param event - The mouse down event triggered by the user.
   * @returns A promise that resolves when the operation is complete.
   */
  async _onClearSearchTerms(event: JQuery.MouseDownEvent): Promise<void> {
    if(event.button == 2 && event.currentTarget) {
      event.preventDefault();
      this.filters.searchTerms = ""
      this.render()
    }
  }

  
  /**
   * Handles the click event for toggling the visibility of filters.
   * 
   * @param event - The click event triggered by the user.
   * @returns A promise that resolves when the toggle action is complete.
   * 
   * This method checks if the current target exists,
   * and then toggles the 'collapsed' class on both the filters and the toggle elements.
   * It also updates the icon class based on the visibility of the filters and sets the 
   * `filters_prefs.visible` property accordingly.
   */
  async _onClickFiltersToggle(event: Event): Promise<void> {
    event.preventDefault();
    if(event.currentTarget) {
      const toggle = $(event.currentTarget)
      const filters = this.html?.find(`.filters`)
      if(filters) {
        filters.toggleClass("collapsed")
        toggle.toggleClass("collapsed")
        toggle.find("i")?.attr('class', filters.is(":visible") ? "fa-solid fa-angles-left" : "fa-solid fa-angles-right")
        this.filters_prefs!.visible = filters.is(":visible")
      }
    }
  }

  /** Chnage collection */
  async _onClickCollection(): Promise<void> {
    const selCollection = this.html?.find('.filters input[name=collection]:checked').attr('id')
    if(selCollection && this.filters_prefs!.collection != selCollection) {
      this.filters_prefs!.collection = selCollection
      this.filters.creator = ""
      this.filters.pack = ""
      this.filters.folder = ""
      this.filters_prefs!.focus = "collection#" + selCollection
      this.render()
    }
  }

  /** Filter interactions */
  async _onClickAssetType(): Promise<void> {
    const selType = Number(this.html?.find('.filters input[name=asset_type]:checked').attr('id'))
    if(selType && this.filters.type != selType) {
      this.filters.type = selType as MouCollectionAssetTypeEnum
      this.filters_prefs!.focus = "type#" + selType
      this.render()
    }
  }

  /** Load more assets when reaching the end of the page */
  async _onScroll(event: Event) {
    if(this.ignoreScroll || this.page < 0) return;
    if(event.currentTarget) {
      const target = $(event.currentTarget)
      const scrollHeight = target.prop("scrollHeight")
      const scrollTop = target.scrollTop()
      const clientHeight = target.innerHeight()
      if(scrollHeight && scrollTop && clientHeight && (scrollTop + clientHeight >= scrollHeight - 20)) {
        this.ignoreScroll = true 
        await this.loadMoreAssets()
        this.ignoreScroll = false
      }
    }
  }

  /** Mouse over an item : render menu */
  _onShowMenu(event: Event) {
    if(event.currentTarget) {
      const target = $(event.currentTarget)
      const asset = target.closest(".asset")
      const selAsset = this.currentAssets.find((a) => a.id == asset.data("id"))
      if(selAsset) {
        const actions = this.collection?.getActions(selAsset)
        if(actions && actions.length > 0) {
          asset.find(".menu").css("display", "flex"); 
          asset.find(".overlay").show();
          renderTemplate(`modules/${MODULE_ID}/templates/browser-assets-actions.hbs`, { 
            actions: actions.filter(a => a.small === undefined || !a.small),
            smallActions: actions.filter(a => a.small !== undefined && a.small),
          }).then( (html) => {
            asset.find(".menu").html(html)
            asset.find(".menu button").on("click", this._onAction.bind(this))
            asset.find(".menu button").on("mouseenter", this._onActionShowHint.bind(this))
            asset.find(".menu button").on("mouseleave", this._onActionHideHint.bind(this))
          })
        } else {
          this.logWarn(`No action for asset ${selAsset.name} (${selAsset.id})`)
        }
      } 
      else {
        this.logError(`Asset '${asset.data("id")}' not found. This must be a bug in Moulinette.`)
      }
      
    }
  }

  /** Mouse out an item : hide menu */
  _onHideMenu(event: Event) {
    if(event.currentTarget) {
      const target = $(event.currentTarget)
      const asset = target.closest(".asset")
      asset.find(".menu").html("")
      asset.find(".menu").hide(); 
      asset.find(".overlay").hide();
    }
  }

  /** User clicked on menu item */
  _onAction(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    if(event.currentTarget) {
      const target = $(event.currentTarget)
      const actionId = target.data("id")
      const assetId = target.closest(".asset").data("id")
      const selAsset = this.currentAssets.find((a) => a.id == assetId)
      if(selAsset) {
        this.collection?.executeAction(actionId, selAsset)  
      }
    }
  }

  /** User clicked on asset creator */
  _onClickAssetCreator(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    if(event.currentTarget) {
      const target = $(event.currentTarget)
      // collection has creators => filter by creator
      if(this.html!.find("#creator-select").length! > 0) {
        const creator = target.closest(".source").data("creator")
        if(creator) {
          this.filters.creator = creator
          this.filters.pack = ""
          this.render()
        }
      }
      // otherwise, open creator's url
      else {
        const asset = target.closest(".asset")
        const selAsset = this.currentAssets.find((a) => a.id == asset.data("id"))
        if(selAsset && selAsset.creatorUrl) {
          window.open(selAsset.creatorUrl, "_blank")
        }
      }
    }
  }

  _onClickAssetPack(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    if(event.currentTarget) {
      const target = $(event.currentTarget)
      const creator = target.closest(".source").data("creator")
      const packId = target.closest(".source").data("pack")
      if(packId) {
        if(creator) {
          this.filters.creator = creator
        }
        this.filters.pack = "" + packId
        this.render()
      }
    }
  }

  _onClearFilters(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.filters.creator = ""
    this.filters.pack = ""
    this.filters.type = MouCollectionAssetTypeEnum.Map,
    this.filters.folder = ""
    this.currentFoldersScroll = { top: 0, left: 0 }
    this.render()
  }

  _onActionShowHint(event: Event) {
    event.preventDefault();
    if(event.currentTarget) {
      const button = $(event.currentTarget)           // asset's button
      const asset = button.closest(".asset")          // asset inside the content
      const content = asset.closest(".content")       // entire content
      const actionHint = content.find(".actionhint")  // hint box
      // Replace hint title & description
      const selAsset = this.currentAssets.find((a) => a.id == asset.data("id"))
      if(!selAsset) return;
      const hint = this.collection?.getActionHint(selAsset, button.data("id"))
      if(!hint) return;
      actionHint.find("h3").html(hint.name)
      actionHint.find(".description").html(hint.description)
      actionHint.find(".thumbnail").css("background-image", `url('${selAsset.previewUrl}')`)
      // Show hint (to the right if enough space, otherwise to the left)
      let posTop = 0
      let posLeft = 0
      const buttonPos = button.position()
      const assetPos = asset.position()  
      const contentScrollY = content.scrollTop()
      if(asset.hasClass("block")) {
        const assetWidth = asset.outerWidth()
        const contentWidth = content.outerWidth(true)
        if(assetPos !== undefined && assetWidth !== undefined && contentWidth !== undefined && buttonPos !== undefined && contentScrollY !== undefined) {
          const remainingSpace = contentWidth - (assetPos.left + assetWidth)
          posTop = assetPos.top + buttonPos.top + contentScrollY
          posLeft = remainingSpace > 220 ? assetPos.left + assetWidth : assetPos.left - 200 + 16
        }
      } else {
        const assetHeight = asset.outerHeight()
        if(assetHeight !== undefined && contentScrollY !== undefined) {
          posTop = assetPos.top + assetHeight + contentScrollY +15
          posLeft = buttonPos.left + 15
        }
      }
      actionHint.css({ top: posTop, left: posLeft, 'visibility': 'visible', 'opacity': 1})
    }
    
    //.css({ top: div.offset().top, left: div.offset().left + div.width() + 20, 'visibility': 'visible', 'opacity': 1})
  }

  _onActionHideHint(event: Event) {
    event.preventDefault();
    this.html?.find(".actionhint").css({'visibility': 'hidden', 'opacity': 0})
  }

  override _onDragStart(event: Event): void {
    if(event.currentTarget) {
      const target = $(event.currentTarget) // target can be asset itself or button
      const assetId = target.closest(".asset").data("id")
      const selAsset = this.currentAssets.find((a) => a.id == assetId)
      if(selAsset) {
        if(selAsset.previewUrl) {
          // @ts-ignore
          const originalEvent = event.originalEvent as DragEvent;
          const dragImage = this.html?.find(".actionhint .thumbnail").get(0)
          // @ts-ignore (checkVisibility invalid?)
          if(dragImage && dragImage.checkVisibility()) {
            originalEvent.dataTransfer?.setDragImage(this.html?.find(".actionhint .thumbnail").get(0) as Element, 50, 50);  
          }
          const T = MouCollectionAssetTypeEnum
          if(this.collection && [T.Actor, T.Audio, T.Image, T.Item, T.Macro].includes(selAsset.type)) {
            const data : MouCollectionDragData = {
              moulinette: { asset: assetId, collection: this.collection?.getId() },
              type: MouCollectionAssetTypeEnum[selAsset.type]
            }
            this.logInfo("DataTransfer", data)
            originalEvent.dataTransfer?.setData('text/plain', JSON.stringify(data));
          }
        }
      }
    }
  }

  _onConfigureCollection(event: Event): void {
    event.preventDefault()
    event.stopPropagation();
    if(event.currentTarget) {
      const module = MouApplication.getModule()
      const collectionId = $(event.currentTarget).closest(".action").data("col")
      const collection = module.collections.find(c => c.getId() == collectionId)
      if(collection) {
        collection.configure(this._callbackAfterConfiguration.bind(this))
      }
    }
  }

  _onChooseFolder(event: Event): void {
    event.preventDefault()
    event.stopPropagation();
    if(event.currentTarget) {
      const selected = $(event.currentTarget).data("path")
      this.filters.folder = this.filters.folder == selected ? "" : selected
      this.currentFoldersScroll = {
        top: $(event.currentTarget).closest(".folders").scrollTop() || 0, 
        left: $(event.currentTarget).closest(".folders").scrollLeft() || 0
      }
      this.render()
    }
  }

  _callbackAfterConfiguration(): void {
    this.render()
  }

  override async close(options?: Application.CloseOptions): Promise<void> {
    await this.storePosition()
    super.close(options);
    const prevSettings = MouApplication.getSettings(SETTINGS_PREVS) as AnyDict
    prevSettings["filterPrefs"] = this.filters_prefs
    prevSettings["filters"] = this.filters
    await MouApplication.setSettings(SETTINGS_PREVS, prevSettings)
  }

  

}