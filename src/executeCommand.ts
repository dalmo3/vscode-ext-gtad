import * as vscode from 'vscode';
import { DocumentSymbolInformation, ISymbolMeta, logger } from './utils';

/**
 * get built-in definitions for current symbol (which is actually the Type definition, sadly - the very reason for this extension)
 * @param symbolMeta information about the symbol whose definition we're looking for
 */
export const executeDefinitionProvider = async (
  symbolMeta: ISymbolMeta
): Promise<vscode.Uri | undefined> => {
  const typeDefinition = (await vscode.commands.executeCommand(
    'vscode.executeDefinitionProvider',
    // 'vscode.executeTypeDefinitionProvider', // for some reason this doesn't work!?
    symbolMeta.uri,
    symbolMeta.position
  )) as vscode.LocationLink[];

  logger.log('Definitions found for current symbol: ', typeDefinition);

  if (!typeDefinition.length)
    vscode.window.showInformationMessage('No type definitions found!');

  /**
   * even though this is an array I believe only a single definition can ever be returned, so we get the one
   * maybe in the future we could check for multiple returns and inspect each of them
   */
  return typeDefinition[0]?.targetUri;
};

/**
 * Get symbol tree
 * It returns an array with the top level symbols only
 * then we browse those recursively through their .children property
 * see: findSymbolRecursively
 *
 * @param uri the document's uri
 */
export const executeDocumentSymbolProvider = async (uri: vscode.Uri) => {
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

/**
 * Navigates to the symbol definition in the current document.
 *
 * todo: add all locations to the array? to do this nees to modify findSymbolRecursively to return the array with all instances of the symbol
 *
 * @param symbol the symbol we're looking for
 */
export const goToSymbol = (symbol: DocumentSymbolInformation) => {
  // go to locations api reference straight from the source code
  // https://github.com/microsoft/vscode/blob/8434c86e5665341c753b00c10425a01db4fb8580/src/vs/editor/contrib/gotoSymbol/goToCommands.ts#L719
  vscode.commands.executeCommand(
    'editor.action.goToLocations',
    symbol.location.uri,
    symbol.selectionRange.start,
    [],
    'goto'
  );
};
