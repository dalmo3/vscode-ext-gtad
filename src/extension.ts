// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { DEBUG, logger, findDefinition } from './utils';

/**
 * The main function
 */
const goToActualDefinition = async () => {
  try {
    // get active editor
    const editor = vscode.window.activeTextEditor!;
    if (!editor) {
      if (DEBUG) vscode.window.showErrorMessage(`No editor active!`);
      throw new Error(`No editor open!`);
    }

    // find symbol under cursor
    const position = editor.selection.active;
    const wordRange = editor.document.getWordRangeAtPosition(position);
    logger.log('wordRange', wordRange);

    if (!wordRange)
      return vscode.window.showErrorMessage('Cursor not on valid symbol!');
    // this actually tests for any text, not valid symbols
    // todo: what's a valid symbol?

    const currentSymbolText = editor.document.getText(wordRange);
    logger.log('wordrange text', currentSymbolText);

    // todo: not sure this is ever needed
    if (!currentSymbolText)
      return DEBUG && vscode.window.showErrorMessage('No symbol selected!');

    /**
     * get built-in definitions for current symbol (which is actually the Type definition, sadly - the very reason for this extension)
     */
    const symbolTypeDefs = (await vscode.commands.executeCommand(
      'vscode.executeDefinitionProvider',
      vscode.window.activeTextEditor?.document.uri,
      position
    )) as vscode.LocationLink[];
    logger.log('Definitions found for current symbol: ', symbolTypeDefs);

    if (!symbolTypeDefs.length)
      return vscode.window.showInformationMessage('No type definitions found!');

    /**
     * even though this is an array I believe only a single definition can ever be returned, so we get the one
     * maybe in the future we could check for multiple returns and inspect each of them
     */
    const symbolTypeDef = symbolTypeDefs[0];

    /**
     *  finally, we dive into the definition files
     */
    const found = await findDefinition(
      currentSymbolText,
      symbolTypeDef.targetUri
    );

    // if all fails, use the built-in "Go to Implementations" command
    if (!found)
      vscode.commands.executeCommand('editor.action.revealDefinition');
  } catch (e) {
    logger.error('Error running extension: ', e);
  }
};

/**
 * this method is called when your extension is activated
 * your extension is activated the very first time the command is executed
 * 
 * @param context 
 */
export function activate(context: vscode.ExtensionContext) {
  // This line of code will only be executed once when your extension is activated
  logger.log('Go to Actual Definition Extension Running....');

  /**
   * The command has been defined in the package.json file
   * Now provide the implementation of the command with registerCommand
   * The commandId parameter must match the command field in package.json
   */
  let disposable = vscode.commands.registerCommand(
    'vscode-ext-gtad.goToActualDefinition',
    goToActualDefinition
  );

  context.subscriptions.push(disposable);
}
