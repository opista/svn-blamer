# Change Log

All notable changes to the "blamer-vs" extension will be documented in this file.

## [0.9.0](https://github.com/opista/svn-blamer/compare/blamer-vs-v0.8.0...blamer-vs-v0.9.0) (2026-03-04)


### Added

* Add deprecation warning for workspace-level `svnExecutablePath` ([#599](https://github.com/opista/svn-blamer/issues/599)) ([9337d60](https://github.com/opista/svn-blamer/commit/9337d60e8f58b0eec338dce411447a1b4ff76c9b))
* Adds blame toggle button to toolbar, configuration of SVN path ([#490](https://github.com/opista/svn-blamer/issues/490)) ([a38ea1d](https://github.com/opista/svn-blamer/commit/a38ea1d5fe72cea53076e4580a1b78ea7c347138))
* Cache gutter image file names to improve performance ([#512](https://github.com/opista/svn-blamer/issues/512)) ([9cdb287](https://github.com/opista/svn-blamer/commit/9cdb28708e704311cc5e6a5b6d23a2ecfb6663b1))
* Dynamic blame tracking & High-performance viewport rendering ([#527](https://github.com/opista/svn-blamer/issues/527)) ([2014009](https://github.com/opista/svn-blamer/commit/2014009dedc6bf4a1551f6f8b34fe7714e3fe210))
* Fetch log per-revision rather than on blame ([#488](https://github.com/opista/svn-blamer/issues/488)) ([5aa65c1](https://github.com/opista/svn-blamer/commit/5aa65c153bc11702b6432cf0e885132547527fbb))


### Fixed

* **#580:** re-apply background hover messages to fix tooltip disappearing ([#583](https://github.com/opista/svn-blamer/issues/583)) ([2543725](https://github.com/opista/svn-blamer/commit/254372508932a475cf655a1edd2caefed00db9d8))
* Duplicate hover messages in line tracker due to untracked decoration ([#487](https://github.com/opista/svn-blamer/issues/487)) ([37b6f29](https://github.com/opista/svn-blamer/commit/37b6f29258861ae6fa796fe906dfa163c3892b67))
* improves error handling ([35b58e3](https://github.com/opista/svn-blamer/commit/35b58e3741d854e11b86f6cde2469fb7c2b523c5))
* Replace inefficient array shuffling algorithm ([#523](https://github.com/opista/svn-blamer/issues/523)) ([c337ced](https://github.com/opista/svn-blamer/commit/c337ced3fc29d631d9e6a6f757b77b8d6546ba62))
* resolve type mismatch and improve gutter icon shuffling ([39d1daf](https://github.com/opista/svn-blamer/commit/39d1daf7128501b468aec211f47d76778d28db80))
* **svn:** Trigger process from working directory ([#501](https://github.com/opista/svn-blamer/issues/501)) ([9fd22da](https://github.com/opista/svn-blamer/commit/9fd22dacdfcbb00a8c72292a2f04cc97ca6bfd71))


### Changed

* re-architect decoration management for O(1) lookups and shared types ([#515](https://github.com/opista/svn-blamer/issues/515)) ([401f400](https://github.com/opista/svn-blamer/commit/401f400f2c44fa8f884798d5f7321a1537cc231a))

## [0.8.0] - 2026-03-04

### Added

- Add deprecation warning for workspace-level `svnExecutablePath`

### Changed

- Use theme color for inline blame text instead of hardcoded RGBA
- Various dependency updates (fast-xml-parser, eslint plugins, node types, minimatch)

## [0.7.8] - 2026-02-24

### Fixed

- Fixes bug where tooltip would not display when visual indicators were disabled
- Fixes command argument injection via filename

## [0.7.6] - 2026-02-03

### Fixed

- Type error where generator could return void
- Gutter icon generator reshuffles on exhaustion

### Changed

- Improve process validation
- Various dependency updates

## [0.7.5] - 2026-01-26

### Changed

- Replaces PNG indicators with SVG to reduce file size
- Cache gutter image file names to improve performance
- Optimises blame fetching by only adding indicators to lines that are currently visible in the viewport
- Optimises hover decoration creation and disposal
- Improves consumption of spawned process data
- Various other performance optimisations
- Various dependency bumps

## Added

- Repository-scoped authentication, which stores the user's credentials using Secure Storage

## Fixed

- Authentication issues caused by lack of credential management
- Errors caused by single blame results when array is expected
- Performance issues caused by blaming large files

## [0.7.3] - 2025-02-10

### Fixed

- Bug with line decorations losing dispose method when being stored

## [0.7.2] - 2025-01-08

### Fixed

- Bug when trying to blame from directories with non-English characters

## [0.7.1] - 2024-05-15

### Changed

- Reduces the minimum required VSCode version to 1.17.0

## [0.7.0] - 2024-04-02

### Changed

- Logs are now fetched individually on line click, rather than in bulk on blame. This should prevent files from locking up when initially blamed
- Auto-blame is disabled by default
- Logs are enabled by default now that performance has been improved

### Added

- Blame toggle button is added to the editor toolbar.
- SVN path/command configuration. Change `"svn"` to a different path or command

## [0.6.2] - 2024-03-31

### Changed

- Nothing

## [0.6.1] - 2024-03-31

## Fixed

- Bug where hover messages would duplicate due to untracked decorations
- Bug where auto-blamed files repeatedly surface an error

## [0.6.0] - 2024-03-28

### Changed

- Major refactor & update of the codebase

### Added

- Introduces auto-blame - blame files as you open them
- Adds configuration option to disable fetching logs. Blame will still work as usual
- Adds a toggle command - toggle between showing and clearing blame
- Appends blame to the line when clicked, a-la gitlens

### Fixed

- Fixes bug where revision is not set, blamer would fail

## [0.5.2] - 2019-12-10

### Fixed

- Fixed a bug where the commit author disappeared

## [0.5.1] - 2019-11-20

### Changed

- Handle cases where author metadata is missing
- Use spawn instead of exec
- Dependency updates

## [0.5.0] - 2019-05-30

### Added

- Mac blame shortcut added
- Setting added to toggle visual indicators

### Changed

- Better error handling, blame indicator in workbench

## [0.4.0] - 2018-08-17

### Added

- Revision number added to tooltips

## [0.3.2] - 2018-07-25

### Fixed

- Decoration issues causing characters to show incorrectly depending on the language

## [0.3.1] - 2018-06-28

### Fixed

- Formatting error in decoration caused by conflict with `mailto:`

## [0.3.0] - 2018-06-28

### Added

- Linux support

## [0.2.0] - 2017-10-24

### Added

- Keyboard shortcut

### Fixed

- Readme typo

## [0.1.0] - 2017-10-21

### Added

- Initial release
