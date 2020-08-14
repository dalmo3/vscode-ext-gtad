// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { logger, findDefinition } from './utils';


/**
 * The main function
 */
const goToActualDefinition = async () => {
  // uses native Go To Declaration command
  // await vscode.commands.executeCommand('editor.action.goToDeclaration');

  // get current editor and cursor position
  const editor = vscode.window.activeTextEditor!;
  const position = editor.selection.active;

  // find symbol under cursor
  const wordRange = editor.document.getWordRangeAtPosition(position);
  logger('wordRange', wordRange);

  if (!wordRange)
    return vscode.window.showInformationMessage('Cursor not on valid symbol!');
  // this actually tests for any text, not valid symbols
  // todo: what's a valid symbol?

  const currentSymbolText = editor.document.getText(wordRange);
  logger('wordrange text', currentSymbolText);

  if (!currentSymbolText)
    return vscode.window.showInformationMessage('No symbol selected!');
  // todo: not sure this is needed

  // get built-in definitions for current symbol
  // (which is actually the Type definition, sadly - the very reason for this extension)
  const symbolTypeDefs = (await vscode.commands.executeCommand(
    'vscode.executeDefinitionProvider',
    vscode.window.activeTextEditor?.document.uri,
    position
  )) as vscode.LocationLink[];
  logger('Definitions found for current symbol: ', symbolTypeDefs);

  if (!symbolTypeDefs.length)
    return vscode.window.showInformationMessage('No type definitions found!');

  // even though this is an array I believe only a single definition can ever be returned, so we get the one
  // maybe in the future we could check for multiple returns and inspect each of them
  const symbolTypeDef = symbolTypeDefs[0];

  // finally, we dive into the definition files
  findDefinition(currentSymbolText, symbolTypeDef.targetUri, ['ts', 'js']);
}
;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // This line of code will only be executed once when your extension is activated
  logger('Find Symbol Extension Running....');

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand(
    'vscode-ext-gtad.goToActualDefinition',
    goToActualDefinition
  );

  context.subscriptions.push(disposable);
}
