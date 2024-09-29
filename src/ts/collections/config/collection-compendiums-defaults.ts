import { AnyDict } from "../../types"
import { MouCompendiumsDefaultsInfos } from "./collection-compendiums-utils"


/**
 * Default mappings and formatters for compendiums entries
 * Can be overridden by modules and systems by changing modifying `game.modules.get("moulinette").compendiumMappings`.
 * (TODO: provide documentation link)
 */
export class MouCompendiumsDefaults {

  /**
   * Default metadata mappings.
   * Supports DnD5e and generic mappings.
   */
  static metadataMappings : AnyDict = {
    dnd5e: {
      Item: {
        type: 'type',
        source: 'system.source',
        rarity: 'system.rarity',
        armorType: 'system.armor.type',
        weaponType: 'system.weaponType',
        toolType: 'system.toolType'
      },
      Actor: {
        type: 'type',
        race: 'system.details.race.name',
        cr: 'system.details.cr',
        hp: 'system.attributes.hp.value',
        ac: 'system.attributes.ac.base',
        walk: 'system.attributes.movement.walk',
        units: 'system.attributes.movement.units',
        background: 'items[type==background].name',
        class: 'items[type==class].name',
        classLvl: 'items[type==class].system.levels'
      }
    },
    '*': {
      Scene: {
        grid: 'grid',
        gridUnits: 'gridUnits',
        gridDistance: 'gridDistance',
        width: 'width',
        height: 'height',
        walls: '#walls',
        lights: '#lights',
        sounds: '#sounds',
        tokens: '#tokens',
        notes: '#notes',
        drawings: '#drawings',
      },
      JournalEntry: {
        pages: '#pages'
      },
      Macro: {
        type: 'type',
        scope: 'scope'
      },
      RollTable: {
        results: '#collections.results'
      },
      Adventure: {
        caption: 'caption',
        scenes: '#scenes',
        actors: '#actors',
        journal: '#journal',
      }
    }
  }

  /**
   * Default metadata formatters for mappings.
   * Provides implementations to format values for the default mappings.
   * Supports DnD5e and generic mappings.
   */
  static metadataMappingsFormatters : AnyDict = {
    
    // DnD5e 
    dnd5e: {
      // Items
      Item: function(meta: AnyDict) {
        const infos = new MouCompendiumsDefaultsInfos()
        if(meta.type) {
          let type = (game as Game).i18n.localize(`TYPES.Item.${meta.type}`)
          if(meta.rarity) {
            type += ` (${(game as Game).i18n.localize((CONFIG as any).DND5E.itemRarity[meta.rarity])})`
          }
          infos.meta.push({ icon: "fa-solid fa-circle-info", label: type })
        }
        if(meta.weaponType) {
          infos.meta.push({ icon: "fa-solid fa-swords", label: (game as Game).i18n.localize((CONFIG as any).DND5E.weaponTypes[meta.weaponType]) })
        }
        else if(meta.armorType) {
          infos.meta.push({ icon: "fa-solid fa-vest", label: (game as Game).i18n.localize((CONFIG as any).DND5E.armorTypes[meta.armorType]) })
        }
        else if(meta.toolType) {
          infos.meta.push({ icon: "fa-solid fa-hammer", label: (game as Game).i18n.localize((CONFIG as any).DND5E.toolTypes[meta.toolType]) })
        }
        return infos
      },
      // Actors
      Actor: function(meta: AnyDict) {
        const infos = new MouCompendiumsDefaultsInfos()
        if(meta.type == "character") {
          infos.meta.push({ icon: "fa-solid fa-arrow-up", label: meta.class ? `Level ${meta.classLvl} ${meta.class}` : "No class" })
          const race = meta.race ? meta.race : "No race" + meta.background ? ` - ${meta.background}` : ""
          infos.meta.push({ icon: "fa-solid fa-person", label: race })
        }
        else if(meta?.type == "npc") {
          let cr = meta.cr
          if(cr == 0.125) cr = "1/8"
          if(cr == 0.25) cr = "1/4"
          if(cr == 0.5) cr = "1/2"
          if(cr != null) {
            infos.meta.push({ label: `CR ${cr}` })
          }
          if(meta.hp) {
            infos.meta.push({ icon: "fa-solid fa-heart", label: meta.hp })
          }
          if(meta.ac) {
            infos.meta.push({ icon: "fa-solid fa-shield", label: meta.ac })
          }
          if(meta.walk && meta.units) {
            infos.meta.push({ icon: "fa-solid fa-shoe-prints", label: `${meta.walk} ${meta.units}` })
          }
        }
        return infos
      }
    },
    // Non-specific types
    '*': {
      // Scenes
      Scene: function(meta: AnyDict) {
        const infos = new MouCompendiumsDefaultsInfos()
        // size
        if(meta.grid) {
          if(meta.grid.constructor == Object) {
            const gridSize = meta.grid.size
            const w = Math.round(meta.width/gridSize)
            const h = Math.round(meta.height/gridSize)
            const step = `${meta.grid.distance} ${meta.grid.units}`
            infos.meta.push({ icon: "fa-solid fa-ruler", label: `${w}x${h} (${step})` })
          } else if(meta.gridUnits && meta.gridDistance) {
            const gridSize = meta.grid
            const w = Math.round(meta.width/gridSize)
            const h = Math.round(meta.height/gridSize)
            const step = `${meta.gridDistance} ${meta.gridUnits}`
            infos.meta.push({ icon: "fa-solid fa-ruler", label: `${w}x${h} (${step})` })
          }
        }
        // components
        if(meta.walls > 0)    { infos.flags.push({ img: "fa-solid fa-block-brick", label: (game as Game).i18n.localize("MOU.scene_has_walls") }) }
        if(meta.lights > 0)   { infos.flags.push({ img: "fa-regular fa-lightbulb", label: (game as Game).i18n.localize("MOU.scene_has_lights") }) }
        if(meta.sounds > 0)   { infos.flags.push({ img: "fa-solid fa-music", label: (game as Game).i18n.localize("MOU.scene_has_sounds") }) }
        if(meta.tokens > 0)   { infos.flags.push({ img: "fa-solid fa-user-alt", label: (game as Game).i18n.localize("MOU.scene_has_tokens") }) }
        if(meta.notes > 0)    { infos.flags.push({ img: "fa-solid fa-bookmark", label: (game as Game).i18n.localize("MOU.scene_has_notes") }) }
        if(meta.drawings > 0) { infos.flags.push({ img: "fa-solid fa-pencil-alt", label: (game as Game).i18n.localize("MOU.scene_has_drawings") }) }
        return infos
      },

      // JournalEntries
      JournalEntry: function(meta : AnyDict) {
        const infos = new MouCompendiumsDefaultsInfos()
        infos.meta.push({ icon: "fa-solid fa-files", label: `${meta.pages} ${(game as Game).i18n.localize(meta.pages > 1 ? "MOU.pages" : "MOU.page")}` })
        return infos
      },
      // Macros
      Macro: function(meta : AnyDict) {
        const infos = new MouCompendiumsDefaultsInfos()
        if(meta.type) {
          const typeCapitalized = meta.type.charAt(0).toUpperCase() + meta.type.slice(1);
          infos.meta.push({ icon: "fa-solid fa-code", label: typeCapitalized })
        }
        return infos
      },
      // RollTables
      RollTable: function(meta : AnyDict) {
        const infos = new MouCompendiumsDefaultsInfos()
        const text = `${meta.results} ${(game as Game).i18n.localize(meta.results > 1 ? "MOU.results" : "MOU.result")}`
        infos.meta.push({ icon: "fa-solid fa-th-list", label: text })
        return infos
      },
      // Adventure
      Adventure: function(meta: AnyDict) {
        const infos = new MouCompendiumsDefaultsInfos()
        console.log(meta)
        return infos
      }
    }
  }
}
