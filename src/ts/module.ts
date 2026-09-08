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

// Last known mouse position in screen (client) coordinates. Used to decide
// where an asset should land when it is added to the canvas without a
// drag & drop (e.g. picked from the Quick Search "Images" mode).
let lastPointerScreenPosition: { x: number, y: number } | null = null;
const onPointerMove = (event: PointerEvent) => {
  lastPointerScreenPosition = { x: event.clientX, y: event.clientY }
}

/**
 * Resolve the world position on which an asset should be centred when it is
 * added to the canvas without an explicit position:
 *  1. the point of the map located under the mouse cursor - the Quick Search
 *     modal floats above the (full-window) canvas, so the spot beneath the
 *     cursor is still a valid map location and is where the user expects the
 *     asset to appear;
 *  2. otherwise the centre of the currently displayed canvas view;
 *  3. as a last resort, the centre of the whole scene.
 *
 * The returned point is the desired *centre* of the asset; the actual
 * placement helpers (e.g. MouFoundryUtils.createTile) offset it by half the
 * asset's size so it ends up centred rather than anchored by a corner.
 */
const resolveCanvasDropPosition = (): { x: number, y: number } => {
  const canvas = canvasInstance as AnyDict
  const sceneRect = canvas?.dimensions?.rect

  // 1. Project the last known cursor position into world coordinates.
  if (canvas?.stage && lastPointerScreenPosition) {
    const client = lastPointerScreenPosition
    const world =
      typeof canvas.canvasCoordinatesFromClient === "function"
        ? canvas.canvasCoordinatesFromClient({ x: client.x, y: client.y })
        : canvas.stage.worldTransform?.applyInverse({ x: client.x, y: client.y })
    if (world && Number.isFinite(world.x) && Number.isFinite(world.y)) {
      // Clamp (rather than reject) a cursor that lands slightly outside the
      // scene: the Quick Search modal sits near the top of the screen, so the
      // point below it frequently projects just past the scene edge. Clamping
      // keeps the asset near the cursor and also guarantees the point passes
      // the in-bounds check performed by the placement helpers.
      if (!sceneRect) return { x: world.x, y: world.y }
      return {
        x: Math.min(Math.max(world.x, sceneRect.x), sceneRect.x + sceneRect.width),
        y: Math.min(Math.max(world.y, sceneRect.y), sceneRect.y + sceneRect.height),
      }
    }
  }

  // 2. Centre of the currently displayed view (stage.pivot is the world point
  //    the camera is centred on)
  const pivot = canvas?.stage?.pivot
  if (pivot && Number.isFinite(pivot.x) && Number.isFinite(pivot.y)) {
    return { x: pivot.x, y: pivot.y }
  }

  // 3. Centre of the scene
  if (sceneRect) return { x: sceneRect.x + sceneRect.width / 2, y: sceneRect.y + sceneRect.height / 2 }
  return { x: 0, y: 0 }
}

Hooks.once("init", () => {
  console.log(`Initializing ${MODULE_ID}`);

  // @ts-ignore
  CONFIG.Canvas.layers["moulayer"] = { layerClass: MouLayer, group: "interface" } as AnyDict;
  
  ((game as Game).settings as AnyDict).register(MODULE_ID, SETTINGS_SESSION_ID, { scope: "world", config: false, type: String, default: "anonymous" });
  ((game as Game).settings as AnyDict).register(MODULE_ID, SETTINGS_DATA_EXCLUSION, { scope: "world", config: false, type: Object, default: {} });
  ((game as Game).settings as AnyDict).register(MODULE_ID, SETTINGS_PREVS, { scope: "client", config: false, type: Object, default: {} });
  
  ((game as Game).settings as AnyDict).register(MODULE_ID, SETTINGS_USE_FOLDERS, {
    name: (game as Game).i18n!.localize("MOU.settings_use_folders"),
    hint: (game as Game).i18n!.localize("MOU.settings_use_folders_hint"),
    scope: "world",
    config: true,
    default: true,
    type: Boolean
  });

  ((game as Game).settings as AnyDict).register(MODULE_ID, SETTINGS_ENABLE_PLAYERS, {
    name: (game as Game).i18n!.localize("MOU.settings_enable_players"),
    hint: (game as Game).i18n!.localize("MOU.settings_enable_players_hint"),
    scope: "world",
    config: true,
    default: false,
    type: Boolean
  });

  ((game as Game).settings as AnyDict).register(MODULE_ID, SETTINGS_S3_BUCKET, {
    name: (game as Game).i18n!.localize("MOU.settings_s3bucket"),
    hint: (game as Game).i18n!.localize("MOU.settings_s3bucket_hint"),
    scope: "world",
    config: true,
    default: "",
    type: String,
    // @ts-ignore
    requiresReload: true
  });

  ((game as Game).settings as AnyDict).register(MODULE_ID, SETTINGS_PICKER_ENABLED, {
    name: (game as Game).i18n!.localize("MOU.settings_picker_enabled"),
    hint: (game as Game).i18n!.localize("MOU.settings_picker_enabled_hint"),
    scope: "world",
    config: true,
    default: false,
    type: Boolean,
    // @ts-ignore
    requiresReload: true
  });

  ((game as Game).settings as AnyDict).register(MODULE_ID, SETTINGS_COLLECTION_CLOUD, { scope: "world", config: false, type: Object, default: { mode: CloudMode.ALL } as AnyDict });
  ((game as Game).settings as AnyDict).register(MODULE_ID, SETTINGS_COLLECTION_LOCAL, { scope: "world", config: false, type: Object, default: {} as AnyDict });

  ((game as Game).settings as AnyDict).register(MODULE_ID, SETTINGS_ADVANCED, { scope: "world", config: false, type: Object, default: {} as AnyDict });

  ((game as Game).settings as AnyDict).register(MODULE_ID, SETTINGS_TOKEN_SELECTOR, { scope: "world", config: false, type: Object, default: {} as AnyDict });
  ((game as Game).settings as AnyDict).register(MODULE_ID, SETTINGS_HIDDEN, { scope: "world", config: false, type: Object, default: {} as AnyDict });
  ((game as Game).settings as AnyDict).register(MODULE_ID, SETTINGS_TOGGLES, { scope: "world", config: false, type: Object, default: {} as AnyDict });

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
    return ((game as Game).settings as AnyDict).get(MODULE_ID, SETTINGS_SESSION_ID) as string
  }

  window.addEventListener(ADD_ASSET_TO_CANVAS, onAddAssetToCanvas)
  window.addEventListener("pointermove", onPointerMove, { passive: true })
});

const onAddAssetToCanvas = async (payload: CustomEventInit<AddAssetToCanvasPayloadType>) => {
  const { position, asset, collection } = payload.detail || {}
  if (asset) {
    const collectionClass = MouApplication.getModule().collections.find(
      (c) => c.getId() == asset.collection,
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
    const dropPosition =
      position && Number.isFinite(position.x) && Number.isFinite(position.y)
        ? position
        : resolveCanvasDropPosition()
    const defaultAction = () =>
      collectionClass?.dropDataCanvas(canvasInstance, asset, {
        moulinette: { asset: asset.id },
        type: MouCollectionAssetTypeEnum[asset.type],
        x: dropPosition.x,
        y: dropPosition.y,
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
  const pickerEnabled = ((game as Game).settings as AnyDict).get(MODULE_ID, SETTINGS_PICKER_ENABLED) as boolean
  const playersEnabled = ((game as Game).settings as AnyDict).get(MODULE_ID, SETTINGS_ENABLE_PLAYERS) as boolean

  if(pickerEnabled && ((game as Game).user?.isGM || playersEnabled)) {
    (CONFIG as any).ux.FilePicker = MoulinetteFilePicker;
    console.warn(`Moulinette: FilePicker is enabled and replacing default FoundryVTT one. You can change it in your the module's configuration.`)
  }
  
});

/**
 * Controls: adds a new Moulinette control
 */
Hooks.on('getSceneControlButtons', (buttons: any) => MouHooks.addMoulinetteControls(buttons))

/**
 * Manage canvas drop
 */
Hooks.on('dropCanvasData', (canvas: any, data: any) => {
  if ('moulinette' in data) {
    // Handle the drop from the "Moulinette Quick Search"-panel
    if (data.data?.isQuickSearch) {
      addAssetToCanvas({
        asset: data.data!.fullAssetData,
        position: { x: Number(data.x), y: Number(data.y) },
      })
    } else if (data.moulinette.collection) {
      // Drag & drop from a collection
      if(MouApplication.getModule().cache.curBrowser) {
        MouApplication.getModule().cache.curBrowser.dropDataCanvas(canvas, data)
      } else {
        module.browser.dropDataCanvas(canvas, data)
      }
    }
  }
});

Hooks.on('canvasReady', (canvas: any) => {
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
            const pickerElement = (app as AnyDict).element as HTMLElement
            ;(pickerElement.querySelector('#file-picker-file') as HTMLInputElement).value = eventPayload.asset.url
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
  // Note: `onPointerMove` is intentionally left attached for the lifetime of
  // the page - it is a cheap passive listener and `closeApplicationV1` fires
  // for every ApplicationV1 that closes, which would otherwise drop it.
})

Hooks.on('closeFilePicker', () => {
  MouApplication.getModule().cache.forceDefaultPicker = false;
  console.log("CLOSING FILE PICKER")  
})