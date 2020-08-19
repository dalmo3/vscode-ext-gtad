// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { DEBUG, logger, findDefinition, ISymbolMeta } from './utils';

/**
 * The main function.
 *
 */
const goToActualDefinition = async () => {
  try {
    const symbolMeta = getSymbolMeta();
    if (!symbolMeta) return;

    const definitionFound = await findDefinition(symbolMeta);

    // if all fails, fallback to the built-in "Go to Implementations" command
    if (!definitionFound)
      vscode.commands.executeCommand('editor.action.revealDefinition');
  } catch (e) {
    logger.error('Error running extension: ', e);
  }
};


/**
 * Get information from symbol under cursor
 */
const getSymbolMeta = (): ISymbolMeta | undefined => {
  // get active editor
  const editor = vscode.window.activeTextEditor!;
  if (!editor) {
    if (DEBUG) vscode.window.showErrorMessage(`No editor active!`);
    throw new Error(`No editor open!`);
  }

  // find symbol under cursor
  const position = editor.selection.active;
  const wordRange = editor.document.getWordRangeAtPosition(position);
  // logger.log('wordRange', wordRange);

  if (!wordRange)
    // this actually tests for any text, not valid symbols
    // todo: what's a valid symbol? -> exclude language keywords
    vscode.window.showErrorMessage('Cursor not on valid symbol!');
  else {
    const symbolName = editor.document.getText(wordRange);
    logger.log('Symbol under cursor: ', symbolName);

    // having established that the symbol is valid, call main function

    return {
      symbolName,
      uri: vscode.window.activeTextEditor?.document.uri!,
      position,
    };
  }
};

/**
 * this method is called when your extension is activated
 * your extension is activated the very first time the command is executed
 *
 * todo: calling the extension too early, before TS is loaded, shouldn't be possible
 * 
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
