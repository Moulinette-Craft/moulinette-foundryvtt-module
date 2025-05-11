import { ModuleData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/packages.mjs";
import MouBrowser from "./apps/browser";
import MouUser from "./apps/user";
import MouCloudClient from "./clients/moulinette-cloud";
import MouCache from "./apps/cache";
import { MouCollection } from "./apps/collection";
import MouEventHandler from "./apps/event-handler";
import MouConfig from "./constants";
import MouMediaUtils from "./utils/media-utils";
import MouFoundryUtils from "./utils/foundry-utils";
import MouFileManager from "./utils/file-manager";

export interface MouModule extends Game.ModuleData<ModuleData> {
  debug: boolean;
  browser: MouBrowser;
  user: MouUser;
  cloudclient: MouCloudClient;
  cache: MouCache;
  collections: MouCollection[];
  eventHandler: MouEventHandler;
  buttons: any;

  // additional tooles (ie. from modules) to load
  tools: AnyDict[]

  // configurations that can be overridden
  configs: MouConfig;

  // compendium mappings
  compendiumMappings: {
    mappings: AnyDict;
    formatters: AnyDict;
  }

  // make utils available to other modules
  utils: {
    media: MouMediaUtils,
    foundry: MouFoundryUtils,
    filemanager: MouFileManager,
    browser: any
  }

  getSessionId(): string;
}

export interface AnyDict {
  [key: string]: any;
}