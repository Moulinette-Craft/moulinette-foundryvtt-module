// Do not remove this import. If you do Vite will think your styles are dead
// code and not include them in the build output.
import "../styles/style.scss";
//import "../templates/browser.hbs";

import MouBrowser from "./apps/browser";
import MouUser from "./apps/user";
import MouCloudClient from "./clients/moulinette-cloud";
import { MODULE_ID, SETTINGS_S3_BUCKET, SETTINGS_SESSION_ID } from "./constants";
import MouLayer from "./layers/mou-layer";
import { MouModule } from "./types";
import MouCache from "./utils/cache";
import MouMediaUtils from "./utils/media-utils";
import { MouCollection } from "./apps/collection";
import MouCollectionCloud, { CloudMode } from "./collections/collection-cloud";

let module: MouModule;

Hooks.once("init", () => {
  console.log(`Initializing ${MODULE_ID}`);

  module = (game as Game).modules.get(MODULE_ID) as MouModule;
  module.browser = new MouBrowser();
  module.user = new MouUser();
  module.cloudclient = new MouCloudClient();
  module.cache = new MouCache();
  module.collections = [] as MouCollection[]
  
  (game as Game).settings.register(MODULE_ID, SETTINGS_SESSION_ID, { scope: "world", config: false, type: String, default: "anonymous" });

  (game as Game).settings.register(MODULE_ID, SETTINGS_S3_BUCKET, {
    name: (game as Game).i18n.localize("MOU.settings_s3bucket"),
    hint: (game as Game).i18n.localize("MOU.settings_s3bucket_hint"),
    scope: "world",
    config: true,
    default: "",
    type: String
  });

  const layers = { moulayer: { layerClass: MouLayer, group: "primary" } }
  CONFIG.Canvas.layers = foundry.utils.mergeObject(Canvas.layers, layers);

  Handlebars.registerHelper('prettyFileSize', function(value) {
    return MouMediaUtils.prettyFilesize(value)
  });

  Handlebars.registerHelper('prettyNumber', function(value, full) {
    return MouMediaUtils.prettyNumber(value, full)
  });

  Handlebars.registerHelper('mouIf', function(cond, value1, value2) {
    return cond ? value1 : value2
  });
});

Hooks.once("ready", () => {
  // force retrieving Moulinette user
  module.cloudclient.getUser()
  // load default collections
  module.collections.push(new MouCollectionCloud(CloudMode.ONLY_SUPPORTED_CREATORS))
  module.collections.push(new MouCollectionCloud(CloudMode.ALL_ACCESSIBLE))
  module.collections.push(new MouCollectionCloud(CloudMode.ALL))
});

/**
 * Controls: adds a new Moulinette control
 */
Hooks.on('getSceneControlButtons', (buttons) => {

  if((game as Game).user?.isGM) {
    const moulinetteTool = {
      activeTool: "",
      icon: "fa-solid fa-photo-film-music",
      layer: "moulayer",
      name: "moulinette",
      title: (game as Game).i18n.localize("MOU.user_authenticated"),
      tools: [{ 
        name: "actions", 
        icon: "fa-solid fa-file-magnifying-glass", 
        title: (game as Game).i18n.localize("MOU.browser"),
        button: true, 
        onClick: () => { module.browser.render(true) } 
      }],
      visible: true
    }
    
    const isValidUser = module.cache.user && module.cache.user.fullName
    moulinetteTool.tools.push({
      name: "authenticated",
      icon: isValidUser ? "fa-solid fa-user-check" : "fa-solid fa-user-xmark",
      title: (game as Game).i18n.localize("MOU.user_authenticated"),
      button: true,
      onClick: () => { module.user.render(true) }
    })

    buttons.push(moulinetteTool)
  }
})