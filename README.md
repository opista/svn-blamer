# SVN Gutter

This is the Visual Studio Code version of the [Blamer](https://github.com/BeauAgst/Blamer) plugin, built for Sublime Text.

## Commands:

This extension contributes the following commands to the Command palette.

`SVN Gutter - Show Blame`: Adds icons to gutter with tooltips containing information from each revision

`SVN Gutter - Clear Blame`: Clears icons and tooltips


## Features

When run, this extension will place a "pip" next to each line of your file. Each differently-coloured pip means a different revision. Hovering a line will produce a tooltip, showing the committer, date, and message. 

For example if you're working on a project and you want to see who modified a specific line:

![Example Usage](example.gif)

> Tip: Many popular extensions utilize animations. This is an excellent way to show off your extension! We recommend short, focused animations that are easy to follow.

## Requirements

This extension requires that you have Tortoise SVN installed, with command-line tools.

## Extension Settings

Currently there are no settings, but some shortcuts will be added in due course.
## Known Issues

- No shortcuts as of yet.
- A little bit slow, because all unique logs have to be retrieved first.

## Release Notes

### 0.1.0

Initial build of extension
