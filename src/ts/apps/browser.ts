import MouConfig, { MODULE_ID, SETTINGS_ADVANCED, SETTINGS_HIDDEN, SETTINGS_PREVS, SETTINGS_TOGGLES } from "../constants";
import { AnyDict } from "../types";
import MouCompatUtils from "../utils/compat-utils";
import MouFileManager from "../utils/file-manager";
import MouMediaUtils from "../utils/media-utils";
import MouApplication from "./application";
import MouBrowserFiltersSources from "./browser-filters-sources";
import { MouCollection, MouCollectionAsset, MouCollectionAssetTypeEnum, MouCollectionDragData, MouCollectionFilters, MouCollectionSearchResults, MouCollectionUtils } from "./collection";


export default class MouBrowser extends MouApplication {
  
  static override APP_NAME = "MouBrowser"
  override APP_NAME = MouBrowser.APP_NAME

  static PAGE_SIZE = 100
  
  private fastLoad: boolean = true; // the very first load is fast, then we load assets before refreshing the page
  private loadInProgress: NodeJS.Timeout | null = null;
  private loadInProgressState: number = 0;
  private disableMenu = false;

  private html?: JQuery<HTMLElement>;
  private ignoreScroll: boolean = false;
  private page: number = 0; // -1 means = ignore. Otherwise, increments the page and loads more data
  private collections?: MouCollection[];
  private collection?: MouCollection;
  private currentAssetsCount: number = 0;
  private currentAssets = [] as MouCollectionAsset[];
  private currentFoldersScroll = { top: 0, left: 0 }
  
  private pickerType?: MouCollectionAssetTypeEnum; // picker mode : no filter and only action is to download and return the asset path
  private pickerCallback?: (path: string) => void;
  
  constructor(options?: ApplicationOptions, pickerType?: string, pickerCallback?: (path: string) => void) {
    super(options);
    this.pickerType = MouCollectionAssetTypeEnum[pickerType as keyof typeof MouCollectionAssetTypeEnum];
    this.pickerCallback = pickerCallback;
  }

  /* Filter preferences */
  private filters_prefs:AnyDict | null = null

  /* Filters */
  private filters: MouCollectionFilters = {
    type: MouCollectionAssetTypeEnum.Map,
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
    // check that module and collections are properly loaded
    const module = MouApplication.getModule()
    if(!module || !module.collections || module.collections.length == 0) 
      throw new Error(`${this.APP_NAME} | Module ${MODULE_ID} not found or no collection loaded`);

    const disabled = MouApplication.getSettings(SETTINGS_HIDDEN) as AnyDict
    this.collections = module.collections.filter( col => {
      col.setPickerMode(!!this.pickerType);
      if(this.pickerType) {
        return col.supportsType(this.pickerType)
      } else {
        return !disabled[col.getId()]
      }
    })
    if(this.collections.length == 0) {
      throw new Error(`${this.APP_NAME} | No collection available!`);
    }

    // initialize filter prefs
    const prevSettings = MouApplication.getSettings(SETTINGS_PREVS) as AnyDict
    if(!this.filters_prefs) {
      if("filterPrefs" in prevSettings && prevSettings["filterPrefs"]) {
        this.filters_prefs = prevSettings["filterPrefs"]
      } else {
        this.filters_prefs = {
          visible: true,
          opensections: { collection: true, asset_type: true, packs: true },
          collection: this.collections[0].getId(),
          focus: "search"
        }
      }
      if("filters" in prevSettings) {
        this.filters = prevSettings["filters"]
      }
      if(this.pickerType) {
        this.filters.type = this.pickerType
      }
    }

    let filtersHTML = ""
    if(!this.fastLoad) {
      filtersHTML = await this.generateFiltersHTML()
    }

    // load advanced settings
    const adv_settings = MouApplication.getSettings(SETTINGS_ADVANCED) as AnyDict
    let settingsHTML = ""
    switch(this.filters.type) {
      case MouCollectionAssetTypeEnum.Audio:
        await MouBrowser.initializeAdvSettings(adv_settings, "audio", MouConfig.DEF_SETTINGS_AUDIO)
      case MouCollectionAssetTypeEnum.Image:
        await MouBrowser.initializeAdvSettings(adv_settings, "image", MouConfig.DEF_SETTINGS_IMAGE)
      
        const type = MouCollectionAssetTypeEnum[Number(this.filters.type)].toLowerCase()
        // @ts-ignore
        settingsHTML = await MouCompatUtils.renderTemplate(`modules/${MODULE_ID}/templates/browser-settings-${type}.hbs`, {
          type: MouCollectionUtils.getTranslatedType(Number(this.filters.type)),
          settings: adv_settings,
          collection: this.filters_prefs!.collection
        });
        break
      default:
        // @ts-ignore
        settingsHTML = await MouCompatUtils.renderTemplate(`modules/${MODULE_ID}/templates/browser-settings-none.hbs`, { 
          type: MouCollectionUtils.getTranslatedType(Number(this.filters.type))
        });
        break
    }

    const toggles = MouApplication.getSettings(SETTINGS_TOGGLES) as AnyDict

    return {
      pickerMode: this.pickerType != undefined && this.pickerType != null,
      user: MouApplication.getModule().cache.user,
      searchTerms: this.filters.searchTerms,
      filtersVisible: this.filters_prefs!.visible,
      mouFilters: filtersHTML,
      mouSettings: settingsHTML,
      toggleHint: "hint" in toggles ? toggles.hint : true,
    };
  }

  /**
   * Initializes the filters and collections for the browser.
   */
  async generateFiltersHTML(): Promise<string> {
    if(!this.collections) {
      this.logError("No collections found. This must be a bug in Moulinette.")
      return ""
    }
    
    // check that selected collection exists
    this.collection = this.collections.find( c => c.getId() == this.filters_prefs!.collection)
    if(!this.collection) {
      this.collection = this.collections[0]
      this.filters_prefs!.collection = this.collection.getId()
    }

    if(!this.collection) {
      this.logError("Collection not found. This must be a bug in Moulinette.")
      return ""
    }

    await this.collection.initialize()

    // reset type if not supported by collection
    if(this.filters.type && !this.collection.supportsType(this.filters.type)) {
      this.filters.type = this.collection.getSupportedTypes()[0]
      this.filters.creator = ""
      this.filters.pack = ""
      this.filters.folder = undefined
    }

    let results : MouCollectionSearchResults = { assets: [], types: [], creators: [], packs: [] }
    try {
      results = await this.collection.searchAssets(this.filters, 0)
    } catch(error: any) {
      this.logError("Unexpected exception while searching assets", error)
      ui.notifications?.error((game as Game).i18n.localize("MOU.error_loading_assets"))
    }
    
    this.page = 0
    this.currentAssets = results.assets

    const disabled = MouApplication.getSettings(SETTINGS_HIDDEN) as AnyDict

    const types = results.types
    const typesObj = types
      .filter( type => {
        if(this.pickerType) {
          return this.pickerType == Number(type.id)
        } else {
          return !disabled["type_" + type.id]
        }
      })
      .map( type => ({ id: Number(type.id), name: MouCollectionUtils.getTranslatedType(Number(type.id)), assetsCount: type.assetsCount}))
    typesObj.sort((a, b) => a.name.localeCompare(b.name))
    
    const creators = results.creators
    let packs = foundry.utils.duplicate(results.packs)
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
        // filter by packName
        if (isNaN(Number(this.filters.pack)) && this.filters.pack.indexOf(";") < 0) {
          for(const pack of packs) {
            if(this.filters.pack.toLowerCase() === pack.name.toLowerCase()) {
              (pack as AnyDict).selected = true
              this.filters.pack = pack.id
              // ugly fix : search again with right filter for pack
              await this._storeSettings()
              results = await this.collection.searchAssets(this.filters, 0)
              this.currentAssets = results.assets
              break;
            }
          }
        }
        // filter by packId (or multiple pack ids)
        else {
          for(const pack of packs) {
            if(this.filters.pack.indexOf(pack.id) >= 0) {
              (pack as AnyDict).selected = true
              break;
            }
          }
        }
      }
    }

    // split types into 2 lists
    const middleIndex = Math.ceil(typesObj.length/2);
    const types1 = typesObj.slice(0, middleIndex);
    const types2 = typesObj.slice(middleIndex);

    // prepare link to website
    let selectedPacks = null
    if(this.filters_prefs?.collection == "mou-cloud" && this.filters.type && this.filters.pack && 
        [MouCollectionAssetTypeEnum.Audio, MouCollectionAssetTypeEnum.Image, MouCollectionAssetTypeEnum.Map].includes(this.filters.type)) {
      selectedPacks = this.filters.pack
    }
    
    // @ts-ignore
    const filtersHTML = await MouCompatUtils.renderTemplate(`modules/${MODULE_ID}/templates/browser-filters.hbs`, {
      collections: this.collections.map( col => ( {id: col.getId(), name: col.getName(), configurable: col.isConfigurable() } )),
      prefs: this.filters_prefs,
      values: this.filters,
      creators,
      packs,
      folders : foldersImproved,
      types1,
      types2,
      showPacksFilter: (creators && creators.length > 0) || (packs && packs.length > 0),
      websiteLink : selectedPacks
    })
    return filtersHTML;
  }

  override async activateListeners(html: JQuery<HTMLElement>): Promise<void> {
    super.activateListeners(html);
    this.html = html
    
    /** Very first load must be fast */
    if(this.fastLoad) {
      const filtersHTML = await this.generateFiltersHTML()
      html.find(".filters").html(filtersHTML)
      this.fastLoad = false
    }

    this._stopLoading()
    
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
    
    html.find(".filters .pack-select a")
      .on("click", this._onOpenPackOnWebsite.bind(this));

    html.find(".filters .collection-config")
      .on("click", this._onConfigureCollectionVisibility.bind(this));
    html.find(".filters .type-config")
      .on("click", this._onConfigureTypeVisibility.bind(this));

    // input triggers searches
    const search = html.find(".search-bar input")
  
    search.on('keypress', async (event) => {
      if(event.key === 'Enter') {
        this.filters.searchTerms = search.val() as string;
        this.filters_prefs!.focus = "search"
        await this.render();
      }
    });
    search.on('mousedown', this._onClearSearchTerms.bind(this));
    html.find(".search-bar button").on('click', async () => {
      this.filters.searchTerms = search.val() as string;
      this.filters_prefs!.focus = "search"
      await this.render();
    });

    const focus = this.filters_prefs?.focus.split("#")
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

    // header options
    html.find("header .options i").on("click", this._onToggleBrowserOptions.bind(this))

    // show/hide advanced settings
    const adv_settings = MouApplication.getSettings(SETTINGS_ADVANCED) as AnyDict
    if(adv_settings.visible) {
      html.find(".advanced_settings").show()
    }
    html.find("footer .settings_toggle a").on("click", async (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const div = html.find(".advanced_settings").toggle();
      
      adv_settings["visible"] = div.is(":visible")
      await MouApplication.setSettings(SETTINGS_ADVANCED, adv_settings, true)
    });

    // advanced settings listeners
    await MouBrowser.initializeAdvSettings(adv_settings, "image", MouConfig.DEF_SETTINGS_IMAGE)
    await MouBrowser.initializeAdvSettings(adv_settings, "audio", MouConfig.DEF_SETTINGS_AUDIO)

    html.find(".advanced_settings select[name=channel]").on("change", async (ev) => {
      const channel = $(ev.currentTarget).val()
      adv_settings.audio.channel = channel
      await MouApplication.setSettings(SETTINGS_ADVANCED, adv_settings, true)
    });
    html.find(".advanced_settings input[name=mou-audio-volume]").on("change", async (ev) => {
      const volumeInput = $(ev.currentTarget).val()
      adv_settings.audio.volume = volumeInput
      await MouApplication.setSettings(SETTINGS_ADVANCED, adv_settings, true)
    });
    html.find(".advanced_settings input[name=tilesize]").on("change", async (ev) => {
      const tilesize = $(ev.currentTarget).val()
      adv_settings.image.tilesize = tilesize
      await MouApplication.setSettings(SETTINGS_ADVANCED, adv_settings, true)
      html.find(".advanced_settings select[name=tilesize_select]").val("")
    });
    html.find(".advanced_settings select[name=tilesize_select]").on("change", async (ev) => {
      const tilesize = $(ev.currentTarget).val()
      if(tilesize) {
        html.find(".advanced_settings input[name=tilesize]").val("" + tilesize)
        adv_settings.image.tilesize = tilesize
        await MouApplication.setSettings(SETTINGS_ADVANCED, adv_settings, true)
        html.find(".advanced_settings select[name=tilesize_select]").val("")
      }
    });
    html.find(".advanced_settings .dropas .option").on("click", async (ev) => {
      const drop_as = $(ev.currentTarget).data("id")
      if(drop_as) {
        adv_settings.image.drop_as = drop_as
        await MouApplication.setSettings(SETTINGS_ADVANCED, adv_settings, true)
        html.find(".advanced_settings .dropas .option").removeClass("active")
        $(ev.currentTarget).addClass("active")
      }
    });
    // show/hide color pickers
    if(adv_settings.image?.bgcolor) {
      html.find(".advanced_settings #bgColorTransp").hide()
    } else {
      html.find(".advanced_settings #bgColor").hide()
    }
    html.find(".advanced_settings input[type=color]").on("input", async (ev) => {
      const fgColor = $(ev.currentTarget).closest(".settings").find("input[name=fgColor]").val()
      const bgColor = $(ev.currentTarget).closest(".settings").find("input[name=bgColor]").val()
      adv_settings.image.fgcolor = fgColor
      adv_settings.image.bgcolor = bgColor
      await MouApplication.setSettings(SETTINGS_ADVANCED, adv_settings, true)
    });
    html.find(".advanced_settings #bgColorEnabled").on("change", async (ev) => {
      const checked = $(ev.currentTarget).is(":checked")
      const bgColorField = $(ev.currentTarget).closest(".settings").find("input[name=bgColor]")
      const bgColorTransp = $(ev.currentTarget).closest(".settings").find("#bgColorTransp")
      if(checked) {
        adv_settings.image.bgcolor = MouConfig.DEF_SETTINGS_IMAGE.bgcolor
        bgColorField.val(MouConfig.DEF_SETTINGS_IMAGE.bgcolor)
        bgColorField.show()
        bgColorTransp.show()
      } else {
        adv_settings.image.bgcolor = ""
        bgColorField.hide()
        bgColorTransp.show()
      }
      await MouApplication.setSettings(SETTINGS_ADVANCED, adv_settings, true)
    })
    

    this.loadMoreAssets()
  }

  /** Load more assets and activate events */
  async loadMoreAssets() {
    if(this.page < 0 || !this.collection) return
    
    let assets: MouCollectionAsset[] = [];
    try {
      if(this.page == 0) {
        assets = this.currentAssets
        this.currentAssets = []
        this.currentAssetsCount = await this.collection.getAssetsCount(this.filters)
      } else {
        const results = await this.collection.searchAssets(this.filters, this.page);
        if(results) {
          assets = results.assets
        }
      }
    } catch (error) {
      this.logError("Error loading assets:", error)
      ui.notifications?.error((game as Game).i18n.localize("MOU.error_loading_assets"));
    }

    this.html?.find(".content .loader").remove()
    
    // handle collection errors (like server connection errors)
    if(this.collection.getCollectionError()) {
      // @ts-ignore
      this.html?.find(".content").append(await MouCompatUtils.renderTemplate(`modules/${MODULE_ID}/templates/browser-error.hbs`, { error: this.collection.getCollectionError() }))
      this.page = -1
      return
    }

    if(assets.length == 0) {
      if(this.page == 0) {
        if(!this.collection.isBrowsable() && (!this.filters.searchTerms || this.filters.searchTerms.length < 3)) {
          // @ts-ignore
          this.html?.find(".content").append(await MouCompatUtils.renderTemplate(`modules/${MODULE_ID}/templates/browser-searchrequired.hbs`, {}))
        } else {
          // @ts-ignore
          this.html?.find(".content").append(await MouCompatUtils.renderTemplate(`modules/${MODULE_ID}/templates/browser-nomatch.hbs`, {}))
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
          // @ts-ignore
          html = await MouCompatUtils.renderTemplate(`modules/${MODULE_ID}/templates/browser-assets-rows.hbs`, { 
            MOU_DEF_NOTHUMB: MouConfig.MOU_DEF_NOTHUMB, 
            assets, 
            index, 
            pickerMode: this.pickerType
          })
          break
        default:
          // @ts-ignore
          html = await MouCompatUtils.renderTemplate(`modules/${MODULE_ID}/templates/browser-assets-blocks.hbs`, { 
            MOU_DEF_NOTHUMB: MouConfig.MOU_DEF_NOTHUMB, 
            assets, 
            index, 
            pickerMode: this.pickerType,
            isIcons: this.filters.type == MouCollectionAssetTypeEnum.Icon 
          })
      }
      this.html?.find(".content").append(html)
      Array.prototype.push.apply(this.currentAssets, assets);
    }
    // activate listeners
    this.html?.find(".asset").off()

    if(!this.pickerType) {
      const parent = this
      this.html?.find(".asset").on("mouseenter", this._onShowMenu.bind(this));
      this.html?.find(".asset").on("mouseleave", function(event: Event) {
        parent.disableMenu = false;
        parent._onHideMenu(event)
      });
    } else {
      this.html?.find(".asset").on("click", this._onSelectAsset.bind(this));
    }
    this.html?.find(".asset .menu").on("mousedown", (event) => { 
      if (event.button == 2) {
        this.disableMenu = true;
        this._onHideMenu(event as any);
      }
    });
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
        const icon = section.find('i.right')
        if(filter && icon) {
          filter.toggleClass("collapsed")
          icon.attr('class', icon.hasClass("fa-square-minus") ? "right fa-regular fa-square-plus" : "right fa-regular fa-square-minus")
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
        this.filters.folder = undefined
        this.filters_prefs!.focus = "creator"
      } else if(combo.attr('id') == "pack-select") {
        this.filters.pack = String(combo.val());
        this.filters_prefs!.focus = "pack"
        this.filters.folder = undefined
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

  /** Change collection */
  async _onClickCollection(): Promise<void> {
    const selCollection = this.html?.find('.filters input[name=collection]:checked').attr('id')
    if(selCollection && this.filters_prefs!.collection != selCollection) {
      this.filters_prefs!.collection = selCollection
      this.filters.creator = ""
      this.filters.pack = ""
      this.filters.folder = undefined
      this.filters_prefs!.focus = "collection#" + selCollection
      this.render()
    }
  }

  /** Filter interactions */
  async _onClickAssetType(): Promise<void> {
    const selType = Number(this.html?.find('.filters input[name=asset_type]:checked').attr('id'))
    if(selType && this.filters.type != selType) {
      this.filters.type = selType as MouCollectionAssetTypeEnum
      this.filters.folder = undefined
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
    if(!this.disableMenu && event.currentTarget) {
      const target = $(event.currentTarget)
      const asset = target.closest(".asset")
      const selAsset = this.currentAssets.find((a) => a.id == asset.data("id"))
      if(selAsset) {
        const actions = this.collection?.getActions(selAsset)
        if(actions && actions.length > 0) {
          // @ts-ignore
          MouCompatUtils.renderTemplate(`modules/${MODULE_ID}/templates/browser-assets-actions.hbs`, { 
            actions: actions.filter(a => a.small === undefined || !a.small),
            smallActions: actions.filter(a => a.small !== undefined && a.small),
          }).then( (html: any) => {
            asset.find(".menu").css("display", "flex"); 
            asset.find(".overlay").show();
            asset.find(".menu").html(html);
            asset.find(".menu button").on("click", this._onAction.bind(this))
            
            const toggles = MouApplication.getSettings(SETTINGS_TOGGLES) as AnyDict
            const toggleHint = "hint" in toggles ? toggles.hint : true
            if(toggleHint) {
              asset.find(".menu").on("mouseenter", this._onActionShowHint.bind(this))
              asset.find(".menu").on("mouseleave", this._onActionHideHint.bind(this))
              asset.find(".menu button").on("mouseenter", this._onActionShowHint.bind(this))
              asset.find(".menu button").on("mouseleave", this._onActionHideHint.bind(this))
            }
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
      // Replace asset name & creator
      actionHint.find(".asset-name").html(selAsset.name)
      actionHint.find(".asset-creator").html(selAsset.creator!)
      if(selAsset.format == "tiny") {
        actionHint.find(".asset-info").show()
      } else {
        actionHint.find(".asset-info").hide()
      }

      const hint = this.collection?.getActionHint(selAsset, button.data("id"))
      if(hint) {
        actionHint.find("h3").html(hint.name)
        actionHint.find(".description").html(hint.description)
        actionHint.find(".aboutAction").css("visibility", "visible")
      } else if(asset.hasClass("block")) {
        actionHint.find(".aboutAction").css("visibility", "hidden")
      } else {
        return;
      }
      actionHint.find(".thumbnail").html()
      if(this.filters.type == MouCollectionAssetTypeEnum.Icon) {
        actionHint.find(".thumbnail").html(`<i class="${selAsset.id}"></i>`)
      } else {
        actionHint.find(".thumbnail").css("background-image", `url('${selAsset.previewUrl}')`)
      }
      // Show hint (to the right if enough space, otherwise to the left)
      let posTop = 0
      let posLeft = 0
      const buttonPos = button.position()
      const assetPos = asset.position()  
      const contentScrollY = content.scrollTop()
      const assetWidth = asset.outerWidth()
      const assetHeight = asset.outerHeight()
      const contentWidth = content.outerWidth(true)
      if(asset.hasClass("block")) {
        if(assetPos !== undefined && assetWidth !== undefined && contentWidth !== undefined && buttonPos !== undefined && contentScrollY !== undefined) {
          const remainingSpace = contentWidth - (assetPos.left + assetWidth)
          posTop = assetPos.top + contentScrollY
          posLeft = remainingSpace > 320 ? assetPos.left + assetWidth + 10 : assetPos.left - 305
        }
      } else {
        if(assetHeight !== undefined && contentScrollY !== undefined) {
          posTop = assetPos.top + assetHeight + contentScrollY +15
          if(button.data("small")) {
            posLeft = buttonPos.left - 250
          } else {
            posLeft = buttonPos.left
          }
        }
      }
      actionHint.css({ top: posTop, left: posLeft, 'visibility': 'visible', 'opacity': 1})
    }
    
    //.css({ top: div.offset().top, left: div.offset().left + div.width() + 20, 'visibility': 'visible', 'opacity': 1})
  }

  _onActionHideHint(event: Event) {
    event.preventDefault();
    if(event.currentTarget) {
      const button = $(event.currentTarget)    // asset's button
      const buttonId = button.data("id")
      const asset = button.closest(".asset")   // asset inside the content      
      if(asset.hasClass("block") && buttonId) {
        this.html?.find(".aboutAction").css("visibility", "hidden")
      } else {
        this.html?.find(".actionhint").css({'visibility': 'hidden', 'opacity': 0})    
      }
    }
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
        collection.configure(this._callbackRefresh.bind(this))
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

  _callbackRefresh(): void {
    this.render()
  }


  /**
   * Asynchronously stores the current filter settings.
   * 
   * This method retrieves the previous settings, updates them with the current
   * filter preferences and filters, and then saves the updated settings.
   * 
   * @returns {Promise<void>} A promise that resolves when the settings have been successfully stored.
   */
  async _storeSettings() {
    const prevSettings = MouApplication.getSettings(SETTINGS_PREVS) as AnyDict
    prevSettings["filterPrefs"] = this.filters_prefs
    prevSettings["filters"] = this.filters
    await MouApplication.setSettings(SETTINGS_PREVS, prevSettings)
  }

  override async close(options?: Application.CloseOptions): Promise<void> {
    this._stopLoading()
    this.fastLoad = true
    await this.storePosition()
    super.close(options);
    await this._storeSettings()
  }
 
  /** User clicked on item asset */
  async _onSelectAsset(event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    if(!this.pickerType) return;
    if(event.currentTarget) {
      const target = $(event.currentTarget)
      const assetId = target.closest(".asset").data("id")
      const selAsset = this.currentAssets.find((a) => a.id == assetId)
      if(selAsset) {
        const path = await this.collection?.selectAsset(selAsset)  
        if(path && this.pickerCallback) {
          this.pickerCallback(path)
          this.close()
          return
        } else {
          this.logError(`Collection didn't return path ${path} properly or empty callback ${this.pickerCallback}.`)
        }
      } else {
        this.logError(`Asset '${assetId}' not found. This must be a bug in Moulinette.`)
      }
    }
    ui.notifications?.error((game as Game).i18n.localize("MOU.error_selecting_asset"))
  }

  
  _stopLoading() {
    if(this.loadInProgress) {
      clearInterval(this.loadInProgress)
      this.loadInProgress = null
      this.loadInProgressState = 0
    }
  }

  /**
   * Overrides the render method to disable the search bar and asset click events.
   * This avoids the user from triggering more rendering while the current one is still processing.
   */
  override render(force?: boolean, options?: Application.RenderOptions<ApplicationOptions> | undefined): unknown {
    if(this.html) {
      const parent = this
      this.html.find(".search-bar .indicator").html('<i class="fa-solid fa-hourglass-start"></i>')
      this.loadInProgress = setInterval(function() {
        let icon = "start"
        switch(parent.loadInProgressState) {
          case 0: icon = "half"; break;
          case 1: icon = "end"; break;
        }
        parent.html!.find(".search-bar .indicator").html(`<i class="fa-solid fa-hourglass-${icon}"></i>`)
        parent.loadInProgressState = (parent.loadInProgressState + 1) % 3
      }, 1000);
      this.html.find(".asset").off()
      this.html.find("input").off()
      this.html.find("input").prop("readonly", true);
      this.html.find("select").off()
      this.html.find("select").prop("readonly", true);
      this._storeSettings()
    }
    return super.render(force, options)
  }

  
  /**
   * Initializes advanced settings for a given type with default values.
   * 
   * @param settings - The settings object where the advanced settings will be initialized.
   * @param type - The type of settings to initialize.
   * @param defaults - The default values for the advanced settings. (See constants.ts for defaults)
   */
  static async initializeAdvSettings(settings: AnyDict, type: string, defaults: AnyDict) {
    if(!(type in settings)) {
      settings[type] = defaults;
      await (game as Game).settings.set(MODULE_ID, SETTINGS_ADVANCED, settings) // save new settings
      return
    }
    let changed = false
    for(const key of Object.keys(defaults)) {
      if(!(key in settings[type])) {
        settings[type][key] = defaults[key]
        changed = true
      }
    }
    if(changed) {
      await (game as Game).settings.set(MODULE_ID, SETTINGS_ADVANCED, settings) // save new settings
    }
  }

  async dropDataCanvas(canvas: Canvas, data: AnyDict): Promise<void> {
    const selAsset = this.currentAssets.find((a) => a.id == data.moulinette.asset)   
    if(selAsset) {
      MouApplication.getModule().collections.find(c => c.getId() == data.moulinette.collection)?.dropDataCanvas(canvas, selAsset, data)
    }
  }

  _onOpenPackOnWebsite(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget as HTMLElement;
    const packIds = "" + $(target).data("ids");
    if(packIds.length > 0) {
      const ids = packIds.split(";")
      const creator = $(target).data("creator").slugify();
      const pack = $(target).closest(".pack-select").find("select option:selected").text().slugify();
      if(ids.length == 1) {
        window.open(`https://assets.moulinette.cloud/marketplace/product/${packIds}/${creator}/${pack}`, "_blank")
      } else if(ids.length > 1) {
        Dialog.confirm({
          title: (game as Game).i18n.localize("MOU.confirm_open_multiple_website"),
          content: (game as Game).i18n.format("MOU.confirm_open_multiple_website_note", {count: ids.length}),
          yes: async function() {
            for(const id of ids) {
              window.open(`https://assets.moulinette.cloud/marketplace/product/${id}/${creator}/${pack}`, "_blank")
            }
          },
          no: () => {}
        });
      }
    }
  }

  _onConfigureCollectionVisibility(event: Event): void {
    event.preventDefault()
    event.stopPropagation();
    if(event.currentTarget) {
      const module = MouApplication.getModule()
      new MouBrowserFiltersSources(
        module.collections.map(c => { return { id: c.getId(), name: c.getName(), desc: c.getDescription() }}), 
        (game as Game).i18n.localize("MOU.filters_sources_description"),
        this._callbackRefresh.bind(this)
      ).render(true);
    }
  }

  _onConfigureTypeVisibility(event: Event): void {
    event.preventDefault()
    event.stopPropagation();
    if(event.currentTarget) {
      new MouBrowserFiltersSources(
        Object.entries(MouCollectionAssetTypeEnum).filter(([key, value]) => (!["Undefined", "Scene", "ScenePacker"].includes(key)) && !isNaN(Number(value)))
        .map(([key, value]) => ({ 
          id: "type_" + value, 
          name: (game as Game).i18n.localize("MOU.type_" + key.toLowerCase()),
          desc: (game as Game).i18n.localize("MOU.asset_type_desc_" + key.toLowerCase())
        })).sort((a, b) => a.name.localeCompare(b.name)),
        (game as Game).i18n.localize("MOU.filters_types_description"),
        this._callbackRefresh.bind(this)
      ).render(true);
    }
  }

  _onToggleBrowserOptions(event: Event): void {
    event.preventDefault()
    event.stopPropagation();
    if(event.currentTarget) {
      const id = $(event.currentTarget).data("id")
      if(id && ["hint"].includes(id)) {
        const toggles = MouApplication.getSettings(SETTINGS_TOGGLES) as AnyDict
        if(id in toggles) {
          toggles[id] = !toggles[id]
        } else {
          toggles[id] = false
        }
        MouApplication.setSettings(SETTINGS_TOGGLES, toggles, false).then(() => {
          this.render()
        })
      }
    }
  }

  async search(collection: string, type: string, search: AnyDict = {}) {
    search;
    const module = MouApplication.getModule()
    const disabled = MouApplication.getSettings(SETTINGS_HIDDEN) as AnyDict
    const collections = module.collections.filter( col => { return !disabled[col.getId()] })
    
    const prevSettings = MouApplication.getSettings(SETTINGS_PREVS) as AnyDict
    
    // check that collection exists
    const collectionObj = collections.find(col => col.getId() === collection);
    if(!collectionObj) {
      const availableCollections = collections.map(col => col.getId()).join(", ");
      throw new Error(`${this.APP_NAME} | Collection ${collection} not found. Available collections: ${availableCollections}`);
    }
    prevSettings.filterPrefs!.collection = collection;

    // check that type exists
    const typeObj = MouCollectionUtils.findType(type);
    if(!typeObj || !collectionObj.supportsType(typeObj)) {
      const availableTypes = collectionObj.getSupportedTypes().map(c => MouCollectionAssetTypeEnum[c]).join(", ");
      throw new Error(`${this.APP_NAME} | Type ${type} not found in collection ${collection}. Available types: ${availableTypes}`);
    }
    prevSettings.filters!.type = typeObj
    
    // search filters
    if(search && search.terms && search.terms.length > 0) {
      prevSettings.filters.searchTerms = search.terms
    } else {
      prevSettings.filters.searchTerms = ""
    }
    if(search && search.creator && search.creator.length > 0) {
      prevSettings.filters.creator = search.creator
    } else {
      prevSettings.filters.creator = ""
    }
    if(search && search.pack && search.pack.length > 0) {
      prevSettings.filters.pack = search.pack
    } else {
      prevSettings.filters.pack = ""
    }

    await MouApplication.setSettings(SETTINGS_PREVS, prevSettings)
    this.filters_prefs = prevSettings.filterPrefs
    this.filters = prevSettings.filters
    
    this.render(true)
  }
}