[![](https://vsmarketplacebadge.apphb.com/version/beaugust.blamer-vs.svg)](https://marketplace.visualstudio.com/items?itemName=beaugust.blamer-vs)
[![](https://vsmarketplacebadge.apphb.com/installs/beaugust.blamer-vs.svg)](https://marketplace.visualstudio.com/items?itemName=beaugust.blamer-vs)

# SVN Gutter

This is the Visual Studio Code version of the [Blamer](https://github.com/BeauAgst/Blamer) plugin, built for Sublime Text.

## Commands:

This extension contributes the following commands to the Command palette.

`SVN Gutter - Show Blame`: Adds icons to gutter with tooltips containing information from each revision

`SVN Gutter - Clear Blame`: Clears icons and tooltips

It also adds a keyboard shortcut.

`CTRL + ALT + D`: Will run the `SVN Gutter - Show Blame` command.


## Features

When run, this extension will place an icon next to each line of your file. Each differently-coloured icon means a different revision. Hovering a line will produce a tooltip, showing the committer, date, and message. 

For example if you're working on a project and you want to see who modified a specific line:

![Example Usage](example.gif)

## Requirements

This extension requires that you're on a Windows machine and have Tortoise SVN installed, with command-line tools.

## Extension Settings

Currently there are no settings
## Known Issues

- Likely to be imcompatible with Mac & Linux. ([Pull requests welcome!](https://github.com/BeauAgst/blamer-vs/issues))
- A little bit slow, because all unique logs have to be retrieved first. ([Issue](https://github.com/BeauAgst/blamer-vs/issues/3))

## Release Notes

### 0.2.0
Added keyboard shortcut
### 0.1.0
Initial build of extension


