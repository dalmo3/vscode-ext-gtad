import * as vscode from 'vscode';

export const DEBUG = vscode.workspace
  .getConfiguration('vscode-ext-gtad')
  .get('debug');

export const logger = {
  log: (...args: any[]) => {
    if (DEBUG) console.log(...args);
  },
  error: (...args: any[]) => {
    if (DEBUG) console.error(...args);
  },
};

/**
 * Get symbol tree
 *
 * todo: It's not returning the actual tree, only the top level symbols
 * The top level symbols should have a `children` property but they don't
 */
const findAllSymbolsInCurrentDocument = async () => {
  let allSymbols;
  try {
    allSymbols = await vscode.commands.executeCommand(
      'vscode.executeDocumentSymbolProvider',
      vscode.window.activeTextEditor?.document.uri
    );
    logger.log('symbols in current doc.... ', allSymbols);
  } catch (e) {
    logger.error('Error in executeDocumentSymbolProvider: ', e);
  }
  return allSymbols as vscode.DocumentSymbol[];
};

/**
 * Navigates to the symbol definition in the current document.
 * Currently opens the doc before finding the symbol and uses the command bar to navigate
 *
 * todo: sould be able to find all symbols then match, but that's broken
 *
 * @param symbolName the symbol we're looking for
 */
const goToSymbol = async (symbolName: string) => {
  // find symbol def in current document
  // unused
  const allSymbols = await findAllSymbolsInCurrentDocument();
  const symbolDef = allSymbols.find((s) => s.name === symbolName);
  logger.log('Symbol found: ', symbolDef);
  // if (!symbolDef)
  // return vscode.window.showInformationMessage('No definitions found!');
  // todo: goto symbol declaration
  // if we have the symbol, we have the range and we can go to
  // actually

  try {
    // look for the symbol definition in the current document
    await vscode.commands.executeCommand(
      'workbench.action.quickOpen',
      `@${symbolName}`
    );
    // the previous command only opens the command bar so we need to 'enter'
    await vscode.commands.executeCommand(
      'workbench.action.acceptSelectedQuickOpenItem'
    );
  } catch (e) {
    logger.error('Error in workbench.action.quickOpen', e);
  }
};

/**
 *
 * Tries to find the actual definition for a symbol based on its type definition file.
 *
 * Big assumptions are made. Mainly, that a directory containing a <file>.d.ts will also have an equivalent <file>.ts or <file>.js
 *
 * @param symbolName the symbol whose definition we're looking for
 * @param typeDefFile the definition file found by vs code, typically <file>.d.ts
 * @param extensions the array of file extensions we'll look for
 */
export const findDefinition = async (
  symbolName: string,
  typeDefFile: vscode.Uri,
  extensions: string[]
) => {
  const [ext, ...next] = extensions;

  // create new Uri changing path ending from '.d.ts' to '.ts' and try to open it
  const candidate = typeDefFile.with({
    path: typeDefFile.path.slice(0, -4) + ext,
  });
  let found = false;
  vscode.window.showTextDocument(candidate).then(
    async () => {
      if (DEBUG) vscode.window.showInformationMessage(`Found .${ext} file.`);

      // file is open, proceed to look for symbol definition inside of it
      await goToSymbol(symbolName);
      found = true;
    },
    async () => {
      if (DEBUG) vscode.window.showErrorMessage(`.${ext} not found.`);
      //not found, trying next extension
      if (next.length) {
        found = await findDefinition(symbolName, typeDefFile, next);
      } else if (DEBUG) {
        vscode.window.showErrorMessage(`Defintion file not found.`);
      }
    }
  );
  return found
};
