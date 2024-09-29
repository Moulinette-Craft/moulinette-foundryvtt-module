import MouApplication from "../../apps/application"
import { MODULE_ID } from "../../constants"
import { AnyDict, MouModule } from "../../types"
import MouFoundryUtils from "../../utils/foundry-utils"

export class MouCompendiumsDefaultsInfos {
  meta: { icon?: string, label: string }[]
  flags: { img: string, label: string }[]

  constructor() {
    this.meta = []
    this.flags = []
  }
}

export class CollectionCompendiumsUtils {
  
  static APP_NAME = "CollectionCompendiumsConfig"

  /**
   * Generate asset entry based on mapping
   * Converts into a new object including /meta
   */
  static generateMetaFromLocal(entry: AnyDict, type: string) {
    const module = (game as Game).modules.get(MODULE_ID) as MouModule
    let metaEntry = {} as AnyDict
    try {
      let mappings = {} as AnyDict
      // check if matching preview available for system
      if((game as Game).system.id in module.compendiumMappings.mappings) {
        const meta = module.compendiumMappings.mappings[(game as Game).system.id]
        // check if matching preview available for specific type
        if(type in meta) {
          mappings = meta[type]
        }
      }
      // check if generic preview available
      if("*" in module.compendiumMappings.mappings) {
        const meta = module.compendiumMappings.mappings["*"]
        // check if matching preview available for specific type
        if(type in meta) {
          mappings = meta[type]
        }
      }
      // extract values from mappings
      for(const m of Object.keys(mappings)) {
        const path = mappings[m]
        metaEntry[m] = MouFoundryUtils.getValueFromObject(entry, path)
      }
      
    } catch (error) {
      MouApplication.logError(CollectionCompendiumsUtils.APP_NAME, "Exception thrown while preparing meta for asset: " + entry, error)
    }

    return metaEntry
  }

  /**
   * Returns additional information (default implementation from Moulinette)
   * - Support dnd5e
   */
  static getInformationFromMeta(entry: AnyDict): MouCompendiumsDefaultsInfos | null {
    const _game = game as Game
    const module = (game as Game).modules.get(MODULE_ID) as MouModule
    try {
      let formatter = null

      // check if matching preview available for system
      if(_game.system.id in module.compendiumMappings.formatters && entry.system == _game.system.id) {
        formatter = module.compendiumMappings.formatters[_game.system.id]

        // check if matching preview available for specific type
        if(entry.type in formatter) {
          return formatter[entry.type](entry.meta)
        }
      }
      
      // check if generic preview available
      if("*" in module.compendiumMappings.formatters) {
        formatter = module.compendiumMappings.formatters["*"]

        // check if matching preview available for specific type
        if(entry.type in formatter) {
          return formatter[entry.type](entry.meta)
        }
      }
      
    } catch (error) {
      MouApplication.logError(CollectionCompendiumsUtils.APP_NAME, "Exception thrown while formatting meta for asset: " + entry, error)
    }

    return null
  }

  /**
   * Execute action on clicked entry
   */
  static executeAction(entry : any, type: string) {
    if(entry && type == "RollTable") {
      entry.draw();
    }
  }

}