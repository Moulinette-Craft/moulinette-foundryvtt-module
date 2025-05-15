# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.6.4] - 2025-05-11
### Fixed
- 1.6.1 : unable to set image background transparency (game icons)
- 1.6.2 : error with uninitialized advanced settings
- 1.6.4 : workaround for The Forge (ForgeVTT_FilePicker undefined)
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
