# Go to Actual Definition

Opens the actual definition of a symbol in TypeScript projects/modules. 

## Features

In TypeScript projects (or JS with Intellisense), the default VS Code command 'Go to Definition' takes you to the type declaration instead of the actual function/object definition, essentially behaving the same way as the 'Go to Type Definition' command. 

This extension searches for the actual symbol definition.

If that fails, it falls back to the default 'Go to Definition'.

## Motivation

The underlying [issue](https://github.com/microsoft/TypeScript/issues/6209) is complex one and well known for years. Devs claim there's nothing inherently wrong, while the users are left frustrated.

This is not an attempt to fix the issue, just a dumb hack to navigate around it.

## Requirements

Currently only tested on Windows 10. May or may not work elsewhere.

## Extension Settings

* `vscode-ext-gtad.debug`: Enable/disable debug messages

### Key bindings

There's a placeholder keybinding rule you can edit under VS Code's `Preferences: Keyboard Shorctut`.

The suggested key is `F12` - It'll override the shortcut for VS Code's default 'Go to Definition', which is mostly OK since the script falls back to that.

## Known Issues

Currently the extension leverages VS Code's built-in type definition locator, which takes you to the `foo.d.ts` definition file. Then we look for the respective `foo.js` file in that same directory. Admittedly, that's a pretty narrow use case. 

There are many cases under which the extension will not produce the expected results:
* When the `.js` file exist but is empty
* When types are defined in a separate folder
* When types are defined by a separate `@types` module
* Probably a lot more...

I plan to address some of the most common cases at some point.

If you have suggestions on how to address those or other cases please discuss it on [#1](https://github.com/dalmo3/vscode-ext-gtad/issues/1) or PR directly.

## Release Notes

### 0.1.0
Initial public release.

## Contributing

Yes.

## Licence

MIT