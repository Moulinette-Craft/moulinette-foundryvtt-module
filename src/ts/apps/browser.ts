import MouConfig, { MODULE_ID } from "../constants";
import { AnyDict, MouModule } from "../types";
import MouFileManager from "../utils/file-manager";
import MouApplication from "./application";
import { MouCollection, MouCollectionAsset, MouCollectionAssetTypeEnum, MouCollectionDragData, MouCollectionFilters, MouCollectionUtils } from "./collection";


export default class MouBrowser extends MouApplication {
  
  override APP_NAME = "MouBrowser"
  static PAGE_SIZE = 100
  static DEBOUNCE_TIME = 500 // delay (in ms) before executing search
  
  private html?: JQuery<HTMLElement>;
  private ignoreScroll: boolean = false;
  private page: number = 0; // -1 means = ignore. Otherwise, increments the page and loads more data
  private collection?: MouCollection;
  private currentAssets = [] as MouCollectionAsset[];
  
  /* Filter preferences */
  private filters_prefs:AnyDict = {
    visible: true,
    opensections: { collection: true, asset_type: true, packs: true },
    collection: "mou-compendiums",
    focus: "search"
  }

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
    // check that module and collections are properly loaded
    const module = (game as Game).modules.get(MODULE_ID) as MouModule
    if(!module || !module.collections || module.collections.length == 0) 
      throw new Error(`${this.APP_NAME} | Module ${MODULE_ID} not found or no collection loaded`);
    // check that selected collection exists
    this.collection = module.collections.find( c => c.getId() == this.filters_prefs.collection)
    if(!this.collection) {
      throw new Error(`${this.APP_NAME} | Collection ${this.filters_prefs.collection} couldn't be found!`);
    }

    await this.collection.initialize()

    this.page = 0
    this.currentAssets = []
    const types = await this.collection.getTypes(this.filters)
    const typesObj = types.map( type => ({ id: Number(type.id), name: MouCollectionUtils.getTranslatedType(Number(type.id)), assetsCount: type.assetsCount}))
    // change type if selected type not available for current collection
    if(!types.find(t => t.id == this.filters.type)) {
      this.filters.type = types.length > 0 ? types[0].id : undefined
    }
    const creators = this.filters.type ? await this.collection.getCreators(this.filters.type) : null
    let packs = this.filters.type ? await this.collection.getPacks(this.filters.type, this.filters.creator ? this.filters.creator : "") : null
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
    }

    // split types into 2 lists
    const middleIndex = Math.ceil(typesObj.length/2);
    const types1 = typesObj.slice(0, middleIndex);
    const types2 = typesObj.slice(middleIndex);
    
    return {
      filters: {
        collections: module.collections.map( col => ( {id: col.getId(), name: col.getName(), configurable: col.isConfigurable() } )),
        prefs: this.filters_prefs,
        values: this.filters,
        creators,
        packs,
        folders : foldersImproved,
        types1,
        types2
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
    html.find(".filters input")
      .on("click", this._onClickFilters.bind(this));
    html.find(".filters select")
      .on("change", this._onSelectFilters.bind(this));
    html.find(".content")
      .on('scroll', this._onScroll.bind(this))
    html.find(".filters .action a")
      .on("click", this._onConfigureCollection.bind(this));
    html.find(".filters .folders a")
      .on("click", this._onChooseFolder.bind(this));
  
    
    // input triggers searches
    const search = html.find(".search-bar input");
    let typingTimer: ReturnType<typeof setTimeout>;
    search.on('input', () => {
      clearTimeout(typingTimer);
      typingTimer = setTimeout(() => {
        this.filters.searchTerms = search.val() as string
        this.page = 0
        this.html?.find(".content").html("")
        this.loadMoreAssets()
      }, MouBrowser.DEBOUNCE_TIME);
    });

    switch(this.filters_prefs.focus) {
      case "search": search.trigger("focus"); break
      case "creator": this.html.find("#creator-select").trigger("focus"); break
      case "pack": this.html.find("#pack-select").trigger("focus"); break
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
    const assets = await this.collection.getAssets(this.filters, this.page)
    if(assets.length == 0) {
      if(this.page == 0) {
        this.html?.find(".content").append(await renderTemplate(`modules/${MODULE_ID}/templates/browser-nomatch.hbs`, {}))
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
        this.filters.pack = ""
        this.filters_prefs.focus = "creator"
      } else if(combo.attr('id') == "pack-select") {
        this.filters.pack = String(combo.val());
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
    const type = Number(this.html?.find('.filters input[name=asset_type]:checked').attr('id'))
    this.filters.type = type ? (type as MouCollectionAssetTypeEnum) : MouCollectionAssetTypeEnum.Map
    this.render()
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
      const creator = target.closest(".source").data("creator")
      if(creator) {
        this.filters.creator = creator
        this.filters.pack = ""
        this.render()
      }
    }
  }

  _onClickAssetPack(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    if(event.currentTarget) {
      const target = $(event.currentTarget)
      const creator = target.closest(".source").data("creator")
      const pack = target.closest(".source").data("pack")
      if(creator && pack) {
        this.filters.creator = creator
        this.filters.pack = pack
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
      actionHint.find(".thumbnail").css("background-image", `url('${selAsset.preview}')`)
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
        if(selAsset.preview) {
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
      const module = (game as Game).modules.get(MODULE_ID) as MouModule
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
      this.render()
    }
  }

  _callbackAfterConfiguration(): void {
    this.render()
  }

}