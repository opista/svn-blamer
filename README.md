![GitHub package.json version](https://img.shields.io/github/package-json/v/BeauAgst/blamer-vs?style=for-the-badge)
![GitHub License](https://img.shields.io/github/license/BeauAgst/blamer-vs?style=for-the-badge)

![Visual Studio Marketplace Downloads](https://img.shields.io/visual-studio-marketplace/d/beaugust.blamer-vs?style=for-the-badge)
![Visual Studio Marketplace Installs](https://img.shields.io/visual-studio-marketplace/i/beaugust.blamer-vs?style=for-the-badge)
![Visual Studio Marketplace Rating](https://img.shields.io/visual-studio-marketplace/r/beaugust.blamer-vs?style=for-the-badge)

# SVN Blamer

A Visual Studio Code extension to SVN blame files.
When run, this extension will place an icon next to each line of your file. Each differently-coloured icon means a different revision. Hovering a line will display a tooltip, showing the committer, date, and message. Blame data will also display inline.

![](/marketplace/example.gif)

## Requirements

**Note**: This extension leverages your machine's SVN installation, so you need to install [SVN](https://subversion.apache.org/) first.

### Windows users

If you use TortoiseSVN, make sure the option Command Line Tools is checked during installation, and C:\Program Files\TortoiseSVN\bin is available in PATH.

## Commands

This extension contributes the following commands to the Command palette.

| Command                       | Description                                                            | Shortcut                                               |
| ----------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------ |
| **SVN Blamer - Show blame**   | Blames file, and retrieves log data (if setting is enabled)            | `CTRL + ALT + D` (Windows) <br/>`CTRL + CMD + X` (Mac) |
| **SVN Blamer - Clear blame**  | Clears the applied blame for the active file                           |                                                        |
| **SVN Blamer - Toggle blame** | Will toggle between fetching blame data and clearing visual indicators | `CTRL + ALT + E` (Windows) <br/>`CTRL + CMD + Y` (Mac) |

## Configuration

| Setting                      | Description                                                                                | Default value |
| ---------------------------- | ------------------------------------------------------------------------------------------ | ------------- |
| **Auto Blame**               | Automatically blames files as you open them.                                               | `true`        |
| **Enable Details**           | Enables popup revision log data. Disabling this setting will significantly speed up blame. | `false`       |
| **Enable Visual Indicators** | Toggle visual indicators that sit to the left of the line number.                          | `true`        |

## Known Issues

-   Causes slowdown when the "**Enable Details**" setting is enabled because all unique logs have to be retrieved first. ([#3](https://github.com/BeauAgst/svn-blamer/issues/3))
-   Authentication errors [#5](https://github.com/BeauAgst/svn-blamer/issues/5), [#9](https://github.com/BeauAgst/svn-blamer/issues/9)

## Feedback & Contributing

Please report any bugs, suggestions or documentation requests via [issues](https://github.com/BeauAgst/svn-blamer/issues)
Feel free to submit [pull requests](https://github.com/BeauAgst/svn-blamer/pulls)
