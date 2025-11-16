# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-11-16
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
