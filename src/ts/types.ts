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
import { MouAPI } from "./utils/api";

/**
 * NOTE: we intentionally do NOT extend the types package's internal Module/ModuleData
 * shape here. That internal path moves around between releases of fvtt-types
 * (it's not part of the public API surface), so pinning to it makes every
 * types-package upgrade a potential build break. `game.modules.get(id)` is cast
 * to this interface at the call site instead (see MouApplication.getModule()).
 */
export interface MouModule {
  id: string;
  active: boolean;
  debug: boolean;
  api: MouAPI;
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

/**
 * Identifies the Moulinette asset a document was created from.
 * Stored on every document Moulinette imports (see MouFoundryUtils.PROVENANCE_FLAG).
 */
export interface MouAssetProvenance {
  /** asset identifier, as accepted by /asset/<id> */
  id: string;
  /** identifier of the pack the asset belongs to */
  pack_ref: number;
  /** path of the asset within its pack */
  filepath: string;
}
