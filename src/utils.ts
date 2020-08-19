import { symlink } from 'fs';
import { url } from 'inspector';
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
 * executeDocumentSymbolProvider returns, according to the API, a promise that resolves to an array of SymbolInformation and DocumentSymbol instances
 * I was having issues working with either type until I realised the objects actually have properties from both types, so it made sense to create the intersection type for it
 */
export type DocumentSymbolInformation = vscode.DocumentSymbol &
  vscode.SymbolInformation;

// aux function so we only call executeSymbolProvider once
const findSymbolRecursively = (
  symbolName: string,
  docSymbols: DocumentSymbolInformation[]
): DocumentSymbolInformation | undefined => {
  const foundSymbol = docSymbols.find((s) => s.name === symbolName);
  return (
    foundSymbol ||
    findSymbolRecursively(
      symbolName,
      docSymbols.flatMap((s) => s.children as DocumentSymbolInformation[])
    )
  );
};

/**
 * this is the main function
 *
 * @param symbolName the symbol we're looking for
 * @param uri the document's uri
 */
const findSymbolInDocument = async (symbolName: string, uri: vscode.Uri) => {
  const docSymbols = await executeDocumentSymbolProvider(uri);
  return findSymbolRecursively(symbolName, docSymbols);
};

/**
 * Get symbol tree
 * It returns an array with the top level symbols only
 * then we browse those recursively through their .children property
 * see: findSymbolRecursively
 *
 * @param uri the document's uri
 */
const executeDocumentSymbolProvider = async (uri: vscode.Uri) => {
  let docSymbols;
  try {
    docSymbols = await vscode.commands.executeCommand(
      'vscode.executeDocumentSymbolProvider',
      uri
    );
    logger.log('symbols in current doc.... ', docSymbols);
  } catch (e) {
    logger.error('Error in executeDocumentSymbolProvider: ', e);
  }
  return docSymbols as DocumentSymbolInformation[];
};

//legacy
const findAllSymbolsInCurrentDocument = () =>
  executeDocumentSymbolProvider(vscode.window.activeTextEditor?.document.uri!);

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
  const docSymbols = await findAllSymbolsInCurrentDocument();
  // const allSymbols = docSymbols
  // const symbolDef = docSymbols.find((s) => s.name === symbolName);
  const symbolDef = findSymbolRecursively(symbolName, docSymbols);
  logger.log('Symbol found: ', symbolDef);
  // if (!symbolDef)
  // return vscode.window.showInformationMessage('No definitions found!');
  // todo: goto symbol declaration
  // if we have the symbol, we have the range and we can go to
  // actually

  if (symbolDef) {
    vscode.commands.executeCommand('editor.action.goToLocations');
  }

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
 * todo: this should create all Uri's that we'll look for
 * this function could get really messy as we expand the use cases covered
 * should return Uri[]
 */
const createCandidateArray = () => {};

/**
 *
 * Tries to find the actual definition for a symbol based on its type definition file.
 *
 * Big assumptions are made. Mainly, that a directory containing a <file>.d.ts will also have an equivalent <file>.ts or <file>.js
 *
 * @param symbolName the symbol whose definition we're looking for
 * @param typeDefFile the definition file found by vs code, typically <file>.d.ts
 * @param extensions the array of file extensions we'll look for
 *
 * todo: swap last parameter for a Uri[] with candidates, and create this array somewhere else
 */
export const findDefinition = async (
  symbolName: string,
  typeDefFile: vscode.Uri,
  extensions: string[]
): Promise<boolean> => {
  const [ext, ...next] = extensions;

  // create new Uri changing path ending from '.d.ts' to '.ts' and try to open it
  const candidate = typeDefFile.with({
    path: typeDefFile.path.slice(0, -4) + ext,
  });
  // let found = Promise.resolve(false);

  try {
    // check if file exists, throws if it doesn't
    await vscode.workspace.fs.stat(candidate);
    // don't like using Exception for execution flow, but couldn't find another way to check if file exists without using fs.stat

    if (DEBUG) vscode.window.showInformationMessage(`Found .${ext} file.`);

    // proceed to look for symbol definition inside of it
    const foundsym = await findSymbolInDocument(symbolName, candidate);
    if (foundsym) {
      console.log('found symbol', foundsym);
      // go to locations api reference straight from the source code
      // https://github.com/microsoft/vscode/blob/8434c86e5665341c753b00c10425a01db4fb8580/src/vs/editor/contrib/gotoSymbol/goToCommands.ts#L719
      vscode.commands.executeCommand(
        'editor.action.goToLocations',
        foundsym.location.uri,
        foundsym.location.range.start,
        [],
        'goto'
      );
    }
    return !!foundsym;
  } catch (error) {
    if (DEBUG) vscode.window.showErrorMessage(`.${ext} not found.`);
    //not found, trying next extension

    return findDefinition(symbolName, typeDefFile, next);
  }

  // old method, opened the document first
  // vscode.window.showTextDocument(candidate).then(
  //   async () => {
  //     if (DEBUG) vscode.window.showInformationMessage(`Found .${ext} file.`);

  //     // file is open, proceed to look for symbol definition inside of it
  //     await goToSymbol(symbolName);
  //     found = true;
  //   },
  //   async () => {
  //     if (DEBUG) vscode.window.showErrorMessage(`.${ext} not found.`);
  //     //not found, trying next extension
  //     if (next.length) {
  //       found = await findDefinition(symbolName, typeDefFile, next);
  //     } else if (DEBUG) {
  //       vscode.window.showErrorMessage(`Defintion file not found.`);
  //     }
  //   }
  // );
  // return found;
};
