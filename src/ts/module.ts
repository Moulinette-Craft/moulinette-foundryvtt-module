// Do not remove this import. If you do Vite will think your styles are dead
// code and not include them in the build output.
import "../styles/style.scss";
//import "../templates/browser.hbs";

import MouBrowser from "./apps/browser";
import MouUser from "./apps/user";
import MouCloudClient from "./clients/moulinette-cloud";
import MouConfig, { MODULE_ID, SETTINGS_COLLECTION_CLOUD, SETTINGS_COLLECTION_LOCAL, SETTINGS_DATA_EXCLUSION, SETTINGS_S3_BUCKET, SETTINGS_SESSION_ID, SETTINGS_USE_FOLDERS } from "./constants";
import MouLayer from "./layers/mou-layer";
import { AnyDict, MouModule } from "./types";
import MouCache from "./apps/cache";
import MouMediaUtils from "./utils/media-utils";
import { MouCollection } from "./apps/collection";
import MouCollectionCloud, { CloudMode } from "./collections/collection-cloud";
import MouEventHandler from "./apps/event-handler";
import MouHooks from "./utils/hooks";
import MouCollectionCompendiums from "./collections/collection-compendiums";
import MouCollectionLocal from "./collections/collection-local-index";

let module: MouModule;

Hooks.once("init", () => {
  console.log(`Initializing ${MODULE_ID}`);

  module = (game as Game).modules.get(MODULE_ID) as MouModule;
  module.browser = new MouBrowser();
  module.user = new MouUser();
  module.cloudclient = new MouCloudClient();
  module.cache = new MouCache();
  module.collections = [] as MouCollection[]
  module.eventHandler = new MouEventHandler();
  module.debug = true;
  
  (game as Game).settings.register(MODULE_ID, SETTINGS_SESSION_ID, { scope: "world", config: false, type: String, default: "anonymous" });
  (game as Game).settings.register(MODULE_ID, SETTINGS_DATA_EXCLUSION, { scope: "world", config: false, type: Object, default: {} });

  (game as Game).settings.register(MODULE_ID, SETTINGS_USE_FOLDERS, {
    name: (game as Game).i18n.localize("MOU.settings_use_folders"),
    hint: (game as Game).i18n.localize("MOU.settings_use_folders_hint"),
    scope: "world",
    config: true,
    default: true,
    type: Boolean
  });

  (game as Game).settings.register(MODULE_ID, SETTINGS_S3_BUCKET, {
    name: (game as Game).i18n.localize("MOU.settings_s3bucket"),
    hint: (game as Game).i18n.localize("MOU.settings_s3bucket_hint"),
    scope: "world",
    config: true,
    default: "",
    type: String
  });

  (game as Game).settings.register(MODULE_ID, SETTINGS_COLLECTION_CLOUD, { scope: "world", config: false, type: Object, default: { mode: CloudMode.ALL } as AnyDict });
  (game as Game).settings.register(MODULE_ID, SETTINGS_COLLECTION_LOCAL, { scope: "world", config: false, type: Object, default: {} as AnyDict });

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
});

Hooks.once("ready", () => {
  // force retrieving Moulinette user
  module.cloudclient.getUser()
  // load default collections
  module.collections.push(new MouCollectionCloud())
  module.collections.push(new MouCollectionCompendiums())
  module.collections.push(new MouCollectionLocal())
  // make config available
  module.configs = MouConfig
  // hooks some FVTT functions
  MouHooks.replaceFromDropData()
});

/**
 * Controls: adds a new Moulinette control
 */
Hooks.on('getSceneControlButtons', (buttons) => MouHooks.addMoulinetteControls(buttons))

/**
 * Manage canvas drop
 */
Hooks.on('dropCanvasData', (canvas, data) => {
  if("moulinette" in data && data.moulinette.collection) {
    module.collections.find(c => c.getId() == data.moulinette.collection)?.dropDataCanvas(canvas, data)
  }
});

