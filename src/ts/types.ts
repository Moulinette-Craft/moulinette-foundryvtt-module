import { ModuleData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/packages.mjs";
import MouBrowser from "./apps/browser";
import MouUser from "./apps/user";
import MouCloudClient from "./clients/moulinette-cloud";
import MouCache from "./apps/cache";
import { MouCollection } from "./apps/collection";
import MouEventHandler from "./apps/event-handler";
import MouConfig from "./constants";

export interface MouModule extends Game.ModuleData<ModuleData> {
  debug: boolean;
  browser: MouBrowser;
  user: MouUser;
  cloudclient: MouCloudClient;
  cache: MouCache;
  collections: MouCollection[];
  eventHandler: MouEventHandler;
  configs: MouConfig;
}

export interface AnyDict {
  [key: string]: any;
}