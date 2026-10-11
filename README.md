# Reference Counter for VSCode

This is an open source extension for Visual Studio Code that displays the number of times a given function, class, or method is called in your codebase, as a clickable `N references` label above the declaration.

If you like this extension, please consider starring the repo on GitHub: [reference-counter](https://github.com/gosvig123/reference_count_extension),
if you have any suggestions or feedback, please open an issue on the repo. We also welcome pull requests as long as they are in the spirit of the project and backwards compatible!

The goal of this extension is to help you understand usage of functions, classes, and methods in your code, while you are writing it.

I developed this extension to find unused functions, classes, and methods in my codebase, and understand how much care I need to take when refactoring, portrayed in a single number.

A Visual Studio Code extension that displays the number of references for functions, classes, and methods directly in your code editor, right above each declaration.

## Features

- Shows a `N references` code lens on the line above:
  - Functions
  - Classes
  - Class methods
- Click the code lens to peek at every reference of that symbol
- Automatically updates when you edit code
- Supports multiple programming languages:
  - Python (`.py`)
  - JavaScript (`.js`, `.jsx`)
  - TypeScript (`.ts`, `.tsx`)
- Configurable file exclusion patterns

## Compatibility

This extension is compatible with:
- **VSCode**: Version 1.75.0 and above
- **Cursor**: All versions (Cursor is based on VSCode)
- **VSCodium**: Version 1.75.0 and above
- **Other VSCode forks**: Should work with any fork based on VSCode 1.75.0+

### How It Works

The extension uses VSCode's Language Server Protocol (LSP) integration through standard VSCode APIs:
- `vscode.executeDocumentSymbolProvider` - Gets symbols from your active language server
- `vscode.executeReferenceProvider` - Gets references from your active language server
- `editor.action.showReferences` - Opens the peek references view when you click a count

Counts are rendered as VSCode code lenses, so they need `editor.codeLens` to be enabled (it is on by default).

This means the extension automatically works with any language that has an LSP server installed:
- **TypeScript/JavaScript**: Built-in TypeScript language server
- **Python**: Pylance, Jedi Language Server, or other Python language servers
- **Other languages**: Any language with LSP support can be added

## Configuration

You can configure the extension through VS Code settings: