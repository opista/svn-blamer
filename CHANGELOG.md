# Change Log

All notable changes to the "blamer-vs" extension will be documented in this file.

## [0.8.1](https://github.com/opista/svn-blamer/compare/v0.8.0...v0.8.1) (2026-03-15)


### Fixed

* prevent svn credential leak in error logs ([#611](https://github.com/opista/svn-blamer/issues/611)) ([d11dada](https://github.com/opista/svn-blamer/commit/d11dada57e89a942fbc69dbf62b21571e2f5a8a9))
* **security:** pass SVN credentials via stdin and sync credential repository index ([#622](https://github.com/opista/svn-blamer/issues/622)) ([0a7aa67](https://github.com/opista/svn-blamer/commit/0a7aa679e80982d1e9736348583cf6c7129cf807))


### Changed

* align truncateString logic with consistent 20 char max ([#616](https://github.com/opista/svn-blamer/issues/616)) ([2ba1ca6](https://github.com/opista/svn-blamer/commit/2ba1ca61b0d097d93563914648974ae40ec86675))
* **blamer:** consolidate duplicated error handling logic ([#620](https://github.com/opista/svn-blamer/issues/620)) ([ce14336](https://github.com/opista/svn-blamer/commit/ce14336e8a4913495b07c54772ed9451d1c97cb5))
* Extract DummyLogOutputChannel to shared mock-vscode utility ([#623](https://github.com/opista/svn-blamer/issues/623)) ([62ce9d7](https://github.com/opista/svn-blamer/commit/62ce9d79ab7498c02aef9ab7e3db41bbdd2499ad))
* improve loop iteration efficiency in DecorationManager ([#632](https://github.com/opista/svn-blamer/issues/632)) ([e2ee58e](https://github.com/opista/svn-blamer/commit/e2ee58e8950527734a6bcb1e8648364bd76cada8))
* optimize `mapBlameOutputToBlameModel` to avoid intermediate array allocation ([#630](https://github.com/opista/svn-blamer/issues/630)) ([d14e598](https://github.com/opista/svn-blamer/commit/d14e59831429bb0dce7cd888c50bcf729bbcebb2))
* Optimize setStatusBarText performance ([#629](https://github.com/opista/svn-blamer/issues/629)) ([7af72e4](https://github.com/opista/svn-blamer/commit/7af72e4ff0121989de0330bf67007bb00f5f696c))
* remove explicit any casts from svn.spec.ts ([#633](https://github.com/opista/svn-blamer/issues/633)) ([9184e50](https://github.com/opista/svn-blamer/commit/9184e50480a9f9dc0ba663de5ccfa26c3b532255))
* replace generic error with SvnCommandError in SVN execution ([#624](https://github.com/opista/svn-blamer/issues/624)) ([6231d16](https://github.com/opista/svn-blamer/commit/6231d16e359d02dc427f84bceaccb4a68a5c307a))

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
