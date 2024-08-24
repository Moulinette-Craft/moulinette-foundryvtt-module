import { ModuleData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/packages.mjs";
import MouBrowser from "./apps/browser";

export interface MouModule extends Game.ModuleData<ModuleData> {
  browser: MouBrowser;
}
