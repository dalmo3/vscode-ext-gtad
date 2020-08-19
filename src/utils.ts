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
 * Generates array of 'candidates', i.e. all files where the symbol definition might be located
 * 
 * Element ordering is important since the algorithm stops on the first match
 * 
 * @param symbolName the symbol whose definition we're looking for
 * @param typeDefFile the definition file found by vs code, typically <file>.d.ts
 */
const createCandidateArray = (symbolName: string, typeDefFile: vscode.Uri) => {
  const candidates: vscode.Uri[] = [];

  /**
   * Candidates within the same directory. Assumes that a <file>.d.ts will also have an equivalent <file>.ts or <file>.js
   */
  const extensions = ['ts', 'js'];
  for (const ext of extensions) {
    const candidate = typeDefFile.with({
      path: typeDefFile.path.slice(0, -4) + ext,
    });
    candidates.push(candidate);
  }

  return candidates;
};

/**
 *
 * Tries to find the actual definition for a symbol based on its type definition file.
 *
 * Big assumptions are made. Mainly, that a directory containing a <file>.d.ts will also have an equivalent <file>.ts or <file>.js
 *
 * @param symbolName the symbol whose definition we're looking for
 * @param typeDefFile the definition file found by vs code, typically <file>.d.ts
 *
 * todo: swap last parameter for a Uri[] with candidates, and create this array somewhere else
 */
export const findDefinition = async (
  symbolName: string,
  typeDefFile: vscode.Uri
): Promise<boolean> => {
  const candidates = createCandidateArray(symbolName, typeDefFile);

  // fail early
  if (!candidates.length) return false;

  for (const candidate of candidates) {
    try {
      // check if file exists, throws if it doesn't
      await vscode.workspace.fs.stat(candidate);
      // don't like using Exception for execution flow, but couldn't find another way to check if file exists without using fs.stat

      if (DEBUG)
        vscode.window.showInformationMessage(
          `Found ${candidate.path.split('/').slice(-1)}`
        );

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

        // the first match breaks the loop
        return true;
      }
    } catch (error) {
      if (DEBUG)
        vscode.window.showErrorMessage(
          `${candidate.path.split('/').slice(-1)} not found.`
        );
      //not found, trying next candidate
    }
  }
  return false;
};
