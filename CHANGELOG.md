# Change Log

All notable changes to the "blamer-vs" extension will be documented in this file.

## [0.6.1] - 2024-03-31

## Fixed

-   Bug where auto-blamed files repeatedly surface an error

## [0.6.0] - 2024-03-28

### Changed

-   Major refactor & update of the codebase

### Added

-   Introduces auto-blame - blame files as you open them
-   Adds configuration option to disable fetching logs. Blame will still work as usual
-   Adds a toggle command - toggle between showing and clearing blame
-   Appends blame to the line when clicked, a-la gitlens

### Fixed

-   Fixes bug where revision is not set, blamer would fail

## [0.5.2] - 2019-12-10

### Fixed

-   Fixed a bug where the commit author disappeared

## [0.5.1] - 2019-11-20

### Changed

-   Handle cases where author metadata is missing
-   Use spawn instead of exec
-   Dependency updates

## [0.5.0] - 2019-05-30

### Added

-   Mac blame shortcut added
-   Setting added to toggle visual indicators

### Changed

-   Better error handling, blame indicator in workbench

## [0.4.0] - 2018-08-17

### Added

-   Revision number added to tooltips

## [0.3.2] - 2018-07-25

### Fixed

-   Decoration issues causing characters to show incorrectly depending on the language

## [0.3.1] - 2018-06-28

### Fixed

-   Formatting error in decoration caused by conflict with `mailto:`

## [0.3.0] - 2018-06-28

### Added

-   Linux support

## [0.2.0] - 2017-10-24

### Added

-   Keyboard shortcut

### Fixed

-   Readme typo

## [0.1.0] - 2017-10-21

### Added

-   Initial release
