import { MODULE_ID } from "../constants";
import { MouModule } from "../types";

declare var libWrapper: any;

export default class MouHooks {

  /**
   * Add Moulinette scene control (buttons on the left)
   */
  static addMoulinetteControls(buttons: SceneControl[]) {
    const module = (game as Game).modules.get(MODULE_ID) as MouModule;

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
  }

  /**
   * Replaces fromDropData methods for Item, Macro and JournalEntry
   */
  static replaceFromDropData()  {

    const module = (game as Game).modules.get(MODULE_ID) as MouModule;
    const isLibwrapperAvailable = typeof libWrapper === "function"; // See: https://github.com/ruipin/fvtt-lib-wrapper

    // replace default FVTT implementation for Items
    if (isLibwrapperAvailable) {
      // @ts-ignore
      libWrapper.register("moulinette", "Item.implementation.fromDropData", async (wrapped, ...args) => {
        await module.eventHandler.handleDragAndDrop(args[0])
        return wrapped(...args);
      }, "WRAPPER");
    } else {
      // @ts-ignore
      Item.implementation.fromDropDataOrig = Item.implementation.fromDropData
      // @ts-ignore
      Item.implementation.fromDropData = async function(data, options={}) {
        await module.eventHandler.handleDragAndDrop(data)
        // @ts-ignore
        return await Item.implementation.fromDropDataOrig(data, options)
      }
    }

    // replace default FVTT implementation for Macros
    if (isLibwrapperAvailable) {
      // @ts-ignore
      libWrapper.register("moulinette", "Macro.implementation.fromDropData", async (wrapped, ...args) => {
        //await module.eventHandler.handleDragAndDrop(args[0])
        return wrapped(...args);
      }, "WRAPPER");
    } else {
      // @ts-ignore
      Macro.implementation.fromDropDataOrig = Macro.implementation.fromDropData
      // @ts-ignore
      Macro.implementation.fromDropData = async function(data, options={}) {
        await module.eventHandler.handleDragAndDrop(data)
        // @ts-ignore
        return await Macro.implementation.fromDropDataOrig(data, options)
      }
    }

    // replace default FVTT implementation for JournalEntry
    if (isLibwrapperAvailable) {
      // @ts-ignore
      libWrapper.register("moulinette", "JournalEntry.implementation.fromDropData", async (wrapped, ...args) => {
        await module.eventHandler.handleDragAndDrop(args[0])
        return wrapped(...args);
      }, "WRAPPER");
    } else {
      // @ts-ignore
      JournalEntry.implementation.fromDropDataOrig = JournalEntry.implementation.fromDropData
      // @ts-ignore
      JournalEntry.implementation.fromDropData = async function(data, options={}) {
        await module.eventHandler.handleDragAndDrop(data)
        // @ts-ignore
        return await JournalEntry.implementation.fromDropDataOrig(data, options)
      }
    }
  }
  
}