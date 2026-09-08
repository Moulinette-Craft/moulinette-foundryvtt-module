# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [14.0.1] - 2026-09-07
### Changed
- Moulinette User screen: consistent button styling and sizing, larger section titles
- Removed internal compatibility code for FoundryVTT V12 and earlier

### Fixed
- Console warnings about the deprecated `SceneControlTool#onClick` and the global `FilePicker` namespace
- Media Optimizer staying disabled after a failed download
- Collection configuration reverting to its default state when the browser is opened from an actor portrait or an item icon (#28)
- "Copy to clipboard" doing nothing when FoundryVTT is served over plain HTTP or from an unfocused window (#17)

### Security
- Players could open the browser through the file picker or the quick search shortcut even when Moulinette was not enabled for players (#53)

## [14.0.0] - 2026-09-07
### Added
- Support for FoundryVTT V13/V14 (migrated UI to the ApplicationV2 framework)
- Audio preview now plays short sounds (<30 sec) directly for authenticated users, streamed live instead of being hidden

### Changed
- Quick Search: default position changed to top-center
- Quick Search: keyboard shortcut now toggles visibility instead of only opening it
- Dropped assets are now centered on the cursor when dropped onto the canvas

### Fixed
- CSS not being generated on V12
- Navigation menu (filters) heading size/spacing and advanced settings background
- Status bar not staying pinned to the bottom of the window when resized
- Minimized window mode restoring an unintended minimum size
- Missing vertical scrollbar in filter/visibility configuration windows
- Search input text color
- Detached (pop-out) window breaking drag & drop, search and filters
- Quick Search modal sometimes not opening at all (native dialog light-dismiss behavior conflicting with FoundryVTT's canvas)

## [2.4.0] - 2026-04-26
### Added
- Audio preview mode for private cloud

## [2.3.0] - 2026-04-26
### Added
- Force import scene (let's a the user import a scene from newer version of FVTT)
### Fixed
- 2.3.1 : support for private images from Moulinette Cloud (The Token Vault & Czepeku Tokens)
- 2.3.2 : support for V12
- 2.3.3 : force latest version to be V13/V14
- 2.3.4 : Import image as scene, comes in all squished #57

## [2.2.0] - 2026-04-12
### Added
- Support for FVTT 14
- Predefined sources

## [2.1.1] - 2026-04-05
### Fixed
- 2.1.1 : fix compatibility with Torg System

## [2.0.9] - 2026-02-14
### Fixed
- 2.0.2 : changes affecting character sheets in pf2e #41
- 2.0.3 : Key input issues in Foundry Build 13.351 #43 + Enter doesn't work in setting fields #42
- 2.0.4 : Transparent background doesn't work (Game Icons)
- 2.0.5 : PF2e Character Sheet Interference #48
- 2.0.6 : Moulinette FilePicker drag & drop doesn't work. Canvas exception while switching from TilesLayer to MouLayer.
- 2.0.7 : BUG Module is causing a door icon display glitch #51
- 2.0.8 : Button to switch back to normal file picker #39 && Workaround for Ripper's Media Optimizer
- 2.0.9 : ScenePacker "Import selected" always imports all scenes

### Added
- New interface (PoC) : Moulinette Quick Search limited to game-icons.net images.

## [1.9.0] - 2025-10-13
### Added / Changed
- New cloud mode : all assets downloaded and cached. Separated from the discover mode.
- Drag & drop maps/scenes onto the canvas to add background images as tile
- You can now click and drag a map directly onto the created canvas, which automatically sets the map’s background image on the scene.
- Search is executed as you type
- Search button (in addition to pressing ENTER)
- Enhanced visual indicator for content loading

## [1.8.8] - 2025-07-20
### Fixed
- After opening Media Browser, switching to another layer fails
- 1.8.1 : fix FilePicker to only open for images and videos
- 1.8.2 : too many WebMediaPlayers already in existance (animated assets)
- 1.8.3 : Broken preview in update from v1.8.1 => v1.8.2
- 1.8.4 : Uninitialized settings result into not being able to drag & drop images on canvas
- 1.8.4 : Merge 4K and HD packs (BeneosBattlemaps backwards-compatibility)
- 1.8.7 : Moulinette icon/image is not dispalyed #10
- 1.8.8 : make search case-insensitive
### Added
- Moulinette FilePicker

## [1.7.2] - 2025-06-20
### Fixed
- Local Asset -> Import Config error #7
- Import Config error persists v1.7.1 #8
### Changed
- Compatibility layer for renderTemplate
### Added
- Moulinette API ported to V13 (Media Search)

## [1.6.8] - 2025-05-11
### Fixed
- 1.6.1 : unable to set image background transparency (game icons)
- 1.6.2 : error with uninitialized advanced settings
- 1.6.4 : workaround for The Forge (ForgeVTT_FilePicker undefined)
- 1.6.5 : advanced settings not properly initialized resulting in drag & drop not working
- 1.6.6 : compatibility with WFRP4e
- 1.6.7 : backwards compatibility for older journal entries (without pages)
- 1.6.8 : Forgotten Adventure Import Failure #5 (tentative)
### Added
- Support for FoundryVTT v.13

## [1.5.2] - 2025-04-19
### Fixed
- 1.5.0 : missing export/import local asset configuration
- 1.5.0 : infinite loop if no asset found or using S3 but without "bucket" configuration
- 1.5.1 : False recursive detection for folders with special characters
- 1.5.2 : Fix issue with concatenation for large collections.

### Added
- Advanced settings for images : tile size, drop as
- Advanced settings for audio : audio channel, sound volume
- Advanced settings for game icons : colors
- Link to pack on Moulinette Marketplace
- Configure filters visibility (collection & types)
- Toggle for enabling/disabling hints

## [1.4.0] - 2025-02-22
### Fixed
- 1.4.0: Right-click on context menu doesn't hide it as expected
### Changed
- Smaller & improved view for images
- Filter by folder (useful for large & structured packs)

## [1.3.2] - 2025-01-12
### Fixed
- 1.3.1: Drag & drop failed for non-free/non-supported assets.
- 1.3.2: Hide assets without pack (ie. non-visible)
### Added
- Right click removes the "hover" on asset (letting the user see the information below)
- Moulinette Search windows shows up immediately and then load the data
- Loading indicator (top left corner)

## [1.2.1] - 2025-01-10
### Fixed
- 1.2.1: Media Search fails to open if local index not available
### Changed
- Search triggered on demande (pressing enter or on the button) rather than automatically
- Improve Moulinette Cloud integration for a better performance
- Compatibility with WFRP4e (theme/style)

## [1.1.4] - 2025-01-06
### Fixed
- 1.1.1: strange behaviour when typing in searchbar while search/rendering still processing
- 1.1.2: release bundle not containing the right version (module.json)
- 1.1.3: pipeline for automatic build
- 1.1.4: repository moved to MoulinetteCraft organization
### Added
- Initial public release (MIT license)
