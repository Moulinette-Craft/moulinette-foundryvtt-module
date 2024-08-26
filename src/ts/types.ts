import { ModuleData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/packages.mjs";
import MouBrowser from "./apps/browser";
import MouUser from "./apps/user";
import MouCloudClient from "./clients/moulinette-cloud";
import MouCache from "./utils/cache";

export interface MouModule extends Game.ModuleData<ModuleData> {
  browser: MouBrowser;
  user: MouUser;
  cloudclient: MouCloudClient;
  cache: MouCache;
}

export interface AnyDict {
  [key: string]: any;
}