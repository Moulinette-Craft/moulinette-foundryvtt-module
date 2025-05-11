import MouApplication from "../apps/application";
import { MODULE_ID, SETTINGS_ENABLE_PLAYERS } from "../constants";
import { AnyDict } from "../types";

declare var libWrapper: any;

/**
 * Moulinette hooks
 */
export default class MouHooks {
  
  static compatibilityModeAdd(dictOrArray: AnyDict | AnyDict[], key: string, value: any) {
    // Version 12
    if(Array.isArray(dictOrArray)) {
      dictOrArray.push(value)
    } 
    // Version 13+
    else {
      dictOrArray[key] = value
    }
  }


  /**
   * Adds custom Moulinette controls to the scene controls.
   * 
   * @param {SceneControl[]} buttons - The array of scene control buttons to which the Moulinette controls will be added.
   * 
   * This method checks if the current user is a GM (Game Master). If so, it creates a new control tool for Moulinette,
   * including an icon, layer, name, title, and tools. The tools include an action to open the Moulinette browser and 
   * an authentication status indicator. The authentication status tool's icon changes based on whether the user is 
   * authenticated.
   */
  static addMoulinetteControls(buttons: SceneControl[] | AnyDict) {
    const module = MouApplication.getModule()
    if(!module) return

    const isGM = (game as Game).user?.isGM
    const enablePlayers = (game as Game).settings.get(MODULE_ID, SETTINGS_ENABLE_PLAYERS)

    if(isGM || enablePlayers) {
      let order = 0
      const moulinetteTool = {
        icon: "mou-icon mou-logo",
        layer: "moulayer",
        name: (game as Game).version.startsWith("12.") ? "moucontrols" : "moulinette",
        title: "Moulinette Media Search",
        onChange: () => {},
        onToolChange: () => {},
        tools: (game as Game).version.startsWith("12.") ? [] as AnyDict[] : {} as AnyDict,
        visible: true
      } as AnyDict

      MouHooks.compatibilityModeAdd(buttons, "moulinette", moulinetteTool)

      const search = { 
        name: "search", 
        icon: "fa-solid fa-magnifying-glass", 
        title: (game as Game).i18n.localize("MOU.browser"),
        button: true, 
        onClick: () => { module.browser.render(true) },
        order: order++,
      }

      MouHooks.compatibilityModeAdd(moulinetteTool.tools, "search", search)
      
      
      if(isGM) {
        const isValidUser = module.cache?.user && module.cache?.user.fullName
        MouHooks.compatibilityModeAdd(moulinetteTool.tools, "authenticated", {
          name: "authenticated",
          icon: isValidUser ? "fa-solid fa-user-check" : "fa-solid fa-user-xmark",
          title: (game as Game).i18n.localize("MOU.user_authenticated"),
          button: true,
          onClick: () => { module.user.render(true) },
          order: order++,
        });

        if(module.tools) {
          for(const tool of module.tools) {
            MouHooks.compatibilityModeAdd(moulinetteTool.tools, tool.name, tool)
          }
        }
      }
      
      module.buttons = buttons
    }
  }

  
  /**
   * Replaces the default Foundry VTT implementation for handling drop data for various entities (Actors, Items, Macros, JournalEntries)
   * with custom logic provided by the Moulinette module. This method checks if the `libWrapper` library is available and uses it to
   * register the custom logic. If `libWrapper` is not available, it directly overrides the `fromDropData` method of the respective entities.
   *
   * The custom logic involves invoking the `handleDragAndDrop` method of the `eventHandler` in the Moulinette module.
   *
   * @remarks
   * This method is intended to be called during the initialization phase of the Moulinette module to ensure that the custom drop handling
   * logic is in place before any drag-and-drop operations occur.
   *
   * @throws {Error} If the `game` object or the Moulinette module is not available.
   */
  static replaceFromDropData()  {

    const module = MouApplication.getModule()
    const isLibwrapperAvailable = typeof libWrapper === "function"; // See: https://github.com/ruipin/fvtt-lib-wrapper

    // replace default FVTT implementation for Actors
    if (isLibwrapperAvailable) {
      // @ts-ignore
      libWrapper.register("moulinette", "Actor.implementation.fromDropData", async (wrapped, ...args) => {
        await module.eventHandler.handleDragAndDrop(args[0])
        return wrapped(...args);
      }, "WRAPPER");
    } else {
      // @ts-ignore
      Actor.implementation.fromDropDataOrig = Actor.implementation.fromDropData
      // @ts-ignore
      Actor.implementation.fromDropData = async function(data, options={}) {
        await module.eventHandler.handleDragAndDrop(data)
        // @ts-ignore
        return await Actor.implementation.fromDropDataOrig(data, options)
      }
    }

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