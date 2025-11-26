// Do not remove this import. If you do Vite will think your styles are dead
// code and not include them in the build output.
import "../styles/main.scss";
//import "../templates/browser.hbs";

import MouBrowser from "./apps/browser";
import MouUser from "./apps/user";
import MouCloudClient from "./clients/moulinette-cloud";
import MouConfig, { MODULE_ID, SETTINGS_COLLECTION_CLOUD, SETTINGS_COLLECTION_LOCAL, SETTINGS_DATA_EXCLUSION, SETTINGS_ENABLE_PLAYERS, SETTINGS_PREVS, SETTINGS_S3_BUCKET, SETTINGS_SESSION_ID, SETTINGS_USE_FOLDERS, SETTINGS_ADVANCED, SETTINGS_TOKEN_SELECTOR, SETTINGS_HIDDEN, SETTINGS_TOGGLES, SETTINGS_PICKER_ENABLED, ADD_ASSET_TO_CANVAS, ADDED_ASSET_TO_CANVAS, QUICK_SEARCH_MODAL_ITEM_SELECTED, CLOSE_QUICK_SEARCH_MODAL } from "./constants";
import MouLayer from "./layers/mou-layer";
import { AnyDict, MouModule } from "./types";
import MouCache from "./apps/cache";
import MouMediaUtils from "./utils/media-utils";
import { MouCollection, MouCollectionAssetTypeEnum } from "./apps/collection";
import { CloudMode } from "./collections/collection-cloud-base";
import MouEventHandler from "./apps/event-handler";
import MouHooks from "./utils/hooks";
import MouCollectionCompendiums from "./collections/collection-compendiums";
import MouCollectionLocal, { LocalAssetAction } from "./collections/collection-local-index";
import { MouCompendiumsDefaults } from "./collections/config/collection-compendiums-defaults";
import MouApplication from "./apps/application";
import MouFileManager from "./utils/file-manager";
import MouFoundryUtils from "./utils/foundry-utils";
import MouCollectionGameIcons from "./collections/collection-gameicons";
import MouCollectionBBCSounds from "./collections/collection-bbc-sounds";
import MouCollectionCloudCached from "./collections/collection-cloud-cached";
import MouCollectionCloudPrivate from "./collections/collection-cloud-private";
import MouCollectionFontAwesome from "./collections/collection-fontawesome";
import { MouAPI } from "./utils/api";
import { MoulinetteFilePicker } from "./apps/file-picker";
import MouCollectionCloudOnline from "./collections/collection-cloud-online";
import { addOuterSubscriber as addQuickSearchModalOuterSubscriber, removeOuterSubscriber as removeQuickSearchModalOuterSubscriber } from "../vue/src/utils/quick-search/outer-subscriptions";
import { AddAssetToCanvasPayloadType, ItemIsSelectedPayloadType } from "../vue/src/types/quick-search";
import { addAssetToCanvas } from "../vue/src/components/quick-search/commonFunctions";

let module: MouModule;
let canvasInstance: Canvas;

Hooks.once("init", () => {
  console.log(`Initializing ${MODULE_ID}`);
  
  (game as Game).settings.register(MODULE_ID, SETTINGS_SESSION_ID, { scope: "world", config: false, type: String, default: "anonymous" });
  (game as Game).settings.register(MODULE_ID, SETTINGS_DATA_EXCLUSION, { scope: "world", config: false, type: Object, default: {} });
  (game as Game).settings.register(MODULE_ID, SETTINGS_PREVS, { scope: "client", config: false, type: Object, default: {} });
  
  (game as Game).settings.register(MODULE_ID, SETTINGS_USE_FOLDERS, {
    name: (game as Game).i18n.localize("MOU.settings_use_folders"),
    hint: (game as Game).i18n.localize("MOU.settings_use_folders_hint"),
    scope: "world",
    config: true,
    default: true,
    type: Boolean
  });

  (game as Game).settings.register(MODULE_ID, SETTINGS_ENABLE_PLAYERS, {
    name: (game as Game).i18n.localize("MOU.settings_enable_players"),
    hint: (game as Game).i18n.localize("MOU.settings_enable_players_hint"),
    scope: "world",
    config: true,
    default: false,
    type: Boolean
  });

  (game as Game).settings.register(MODULE_ID, SETTINGS_S3_BUCKET, {
    name: (game as Game).i18n.localize("MOU.settings_s3bucket"),
    hint: (game as Game).i18n.localize("MOU.settings_s3bucket_hint"),
    scope: "world",
    config: true,
    default: "",
    type: String,
    // @ts-ignore
    requiresReload: true
  });

  (game as Game).settings.register(MODULE_ID, SETTINGS_PICKER_ENABLED, {
    name: (game as Game).i18n.localize("MOU.settings_picker_enabled"),
    hint: (game as Game).i18n.localize("MOU.settings_picker_enabled_hint"),
    scope: "world",
    config: true,
    default: false,
    type: Boolean,
    // @ts-ignore
    requiresReload: true
  });

  (game as Game).settings.register(MODULE_ID, SETTINGS_COLLECTION_CLOUD, { scope: "world", config: false, type: Object, default: { mode: CloudMode.ALL } as AnyDict });
  (game as Game).settings.register(MODULE_ID, SETTINGS_COLLECTION_LOCAL, { scope: "world", config: false, type: Object, default: {} as AnyDict });

  (game as Game).settings.register(MODULE_ID, SETTINGS_ADVANCED, { scope: "world", config: false, type: Object, default: {} as AnyDict });

  (game as Game).settings.register(MODULE_ID, SETTINGS_TOKEN_SELECTOR, { scope: "world", config: false, type: Object, default: {} as AnyDict });
  (game as Game).settings.register(MODULE_ID, SETTINGS_HIDDEN, { scope: "world", config: false, type: Object, default: {} as AnyDict });
  (game as Game).settings.register(MODULE_ID, SETTINGS_TOGGLES, { scope: "world", config: false, type: Object, default: {} as AnyDict });

  const layers = { moulayer: { layerClass: MouLayer, group: "primary" } }
  CONFIG.Canvas.layers = foundry.utils.mergeObject(Canvas.layers, layers);

  Handlebars.registerHelper('prettyFileSize', function(value, decimals) {
    return MouMediaUtils.prettyFilesize(value, decimals)
  });

  Handlebars.registerHelper('prettyNumber', function(value, full) {
    return MouMediaUtils.prettyNumber(value, full)
  });

  Handlebars.registerHelper('mouIf', function(cond, value1, value2) {
    return cond ? value1 : value2
  });

  Handlebars.registerHelper('increment', function(value, valueAdd) {
    return value + valueAdd;
  });

  MouHooks.registerKeybindings();

  module = MouApplication.getModule();
  module.browser = new MouBrowser();
  module.user = new MouUser();
  module.cloudclient = new MouCloudClient();
  module.cache = new MouCache();
  module.collections = [] as MouCollection[]
  module.eventHandler = new MouEventHandler();
  module.api = MouAPI;
  module.tools = [];
  module.compendiumMappings = { mappings: MouCompendiumsDefaults.metadataMappings, formatters: MouCompendiumsDefaults.metadataMappingsFormatters }
  module.utils = { media: MouMediaUtils, filemanager: MouFileManager, foundry: MouFoundryUtils, browser: MouBrowser }
  module.debug = true;

  module.getSessionId = () => {
    return (game as Game).settings.get(MODULE_ID, SETTINGS_SESSION_ID) as string
  }

  window.addEventListener(ADD_ASSET_TO_CANVAS, onAddAssetToCanvas)
});

const onAddAssetToCanvas = async (payload: CustomEventInit<AddAssetToCanvasPayloadType>) => {
  const { position, asset, collection } = payload.detail || {}
  if (asset) {
    const collectionClass = MouApplication.getModule().collections.find(
      (c) => c.getId() == collection,
    )
    const exceptions: Array<{
      condition: boolean
      action: () => Promise<any>
    }> = [
      {
        condition:
          collection === 'mou-local' &&
          [MouCollectionAssetTypeEnum.Scene, MouCollectionAssetTypeEnum.Map].includes(asset.type),
        action: () =>
          collectionClass?.executeAction(LocalAssetAction.IMPORT, asset) as Promise<any>,
      },
    ]
    const defaultAction = () =>
      collectionClass?.dropDataCanvas(canvasInstance, asset, {
        moulinette: { asset: asset.id },
        // TODO: the default position defining functionality to be reconsidered
        x: position?.x || canvasInstance.app?.view.width || 0 / 2,
        y: position?.y || canvasInstance.app?.view.height || 0 / 2,
      })
    await (exceptions.find((item) => item.condition)?.action || defaultAction)()
    window.dispatchEvent(new CustomEvent(ADDED_ASSET_TO_CANVAS))
  }
}

Hooks.once("ready", () => {
  // force retrieving Moulinette user
  module.cloudclient.getUser()
  // load default collections
  module.collections.push(new MouCollectionCloudOnline())
  module.collections.push(new MouCollectionCloudCached())
  module.collections.push(new MouCollectionCloudPrivate())
  module.collections.push(new MouCollectionCompendiums())
  module.collections.push(new MouCollectionLocal())
  module.collections.push(new MouCollectionGameIcons())
  module.collections.push(new MouCollectionBBCSounds())
  module.collections.push(new MouCollectionFontAwesome())
  // make config available
  module.configs = MouConfig
  // hooks some FVTT functions
  MouHooks.replaceFromDropData();
  // replace FilePicker with MoulinetteFilePicker
  const pickerEnabled = (game as Game).settings.get(MODULE_ID, SETTINGS_PICKER_ENABLED) as boolean

  if(pickerEnabled) {
    const v12 = (game as Game).version.startsWith("12.")
    if(v12) {
      // @ts-ignore
      FilePicker = MoulinetteFilePicker
    } else {
      (CONFIG as any).ux.FilePicker = MoulinetteFilePicker;
    }
    console.warn(`Moulinette: FilePicker is enabled and replacing default FoundryVTT one. You can change it in your the module's configuration.`)
    
  }
  
});

/**
 * Controls: adds a new Moulinette control
 */
Hooks.on('getSceneControlButtons', (buttons) => MouHooks.addMoulinetteControls(buttons))

/**
 * Manage canvas drop
 */
Hooks.on('dropCanvasData', (canvas, data) => {
  if ('moulinette' in data) {
    // Handle the drop from the "Moulinette Quick Search"-panel
    if (data.data?.isQuickSearch) {
      addAssetToCanvas({
        asset: data.data!.fullAssetData,
        position: { x: Number(data.x), y: Number(data.y) },
      })
    } else if (data.moulinette.collection) {
      // Drag & drop from a collection
      module.browser.dropDataCanvas(canvas, data)
    }
  }
});

Hooks.on('canvasReady', (canvas) => {
  canvasInstance = canvas
})

Hooks.on('renderFilePicker', (app: FilePicker) => {
  if (app.type === 'image') {
    addQuickSearchModalOuterSubscriber<ItemIsSelectedPayloadType>(
      {
        id: 'SELECT_INTO_IMAGE_PICKER',
        targetEvent: QUICK_SEARCH_MODAL_ITEM_SELECTED,
        preventDefaultAction: true,
      },
      {
        callback(eventPayload) {
          if (eventPayload.asset.itemCategory === 'IMAGES') {
            const pickerElement = app.element as unknown as HTMLElement
            ;(pickerElement.querySelector('#file-picker-file') as HTMLInputElement).value =
              eventPayload.asset.url
            pickerElement.querySelector('.files-list > .picked')?.classList?.remove('picked')
            window.dispatchEvent(new CustomEvent(CLOSE_QUICK_SEARCH_MODAL))

            // Highlight the selected field via animation
            let currentFrame = 0,
              totalFrames = 10
            const selectedElement = pickerElement.querySelector('.selected-file') as HTMLElement
            selectedElement.style.borderRadius = '6px'
            const animate = () => {
              if (currentFrame > totalFrames) {
                selectedElement.style.borderRadius = '0px'

                return
              }

              selectedElement.style.boxShadow = `0 0 ${50 * (1 - currentFrame / totalFrames)}px var(--color-light-1)`
              currentFrame++
              requestAnimationFrame(animate)
            }
            animate()
          }
        },
      },
    )
  }
});

Hooks.on("closeFilePicker", () => removeQuickSearchModalOuterSubscriber('SELECT_INTO_IMAGE_PICKER'))

Hooks.on('closeApplicationV1', () => {
  removeQuickSearchModalOuterSubscriber('SELECT_INTO_IMAGE_PICKER')
  window.removeEventListener(ADD_ASSET_TO_CANVAS, onAddAssetToCanvas)
})