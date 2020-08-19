import * as vscode from 'vscode';
import {
  executeDefinitionProvider,
  executeDocumentSymbolProvider,
  goToSymbol,
} from './executeCommand';

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

export interface ISymbolMeta {
  symbolName: string;
  uri: vscode.Uri;
  position: vscode.Position;
}

/**
 *
 * Tries to find the actual definition for a symbol based on its type definition file.
 *
 * Big assumptions are made. Mainly, that a directory containing a <file>.d.ts will also have an equivalent <file>.ts or <file>.js
 *
 * @param symbolMeta information about the symbol whose definition we're looking for
 *
 * todo: swap last parameter for a Uri[] with candidates, and create this array somewhere else
 */
export const findDefinition = async (
  symbolMeta: ISymbolMeta
): Promise<boolean> => {
  const candidates = await createCandidateArray(symbolMeta);

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
      const foundSymbol = await findSymbolInDocument(
        symbolMeta.symbolName,
        candidate
      );
      if (foundSymbol) {
        console.log('found symbol', foundSymbol);

        goToSymbol(foundSymbol);
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

/**
 * Find instances* of a symbol in a document
 *
 * *todo: currently returns the first instance only
 *
 * @param symbolName the symbol we're looking for
 * @param uri the document's uri
 */
const findSymbolInDocument = async (symbolName: string, uri: vscode.Uri) => {
  const docSymbols = await executeDocumentSymbolProvider(uri);

  /**
   * Search recursively through symbols' children. Aux function so we only call executeSymbolProvider once
   *
   * todo: make it return array with all instances of that symbol?
   *
   * @param symbolName the symbol we're looking for
   * @param docSymbols output from symbol provider
   */
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
  return findSymbolRecursively(symbolName, docSymbols);
};

/**
 * Generates array of 'candidates', i.e. all files where the symbol definition might be located
 *
 * Element ordering is important since the algorithm stops on the first match
 *
 * @param symbolName the symbol whose definition we're looking for
 * @param typeDefFile the definition file found by vs code, typically <file>.d.ts
 */
const createCandidateArray = async (symbolMeta: ISymbolMeta) => {
  const candidates: vscode.Uri[] = [];

  // Rule 1
  const typeDefUri = await executeDefinitionProvider(symbolMeta);
  if (typeDefUri)
    candidates.push(...await getCandidatesFromTypeDefUri(typeDefUri));

  return candidates;
};

/**
 * Candidates within the same directory as the type definition file. Assumes that a <file>.d.ts will also have an equivalent <file>.ts or <file>.js
 */
const getCandidatesFromTypeDefUri = async (typeDefUri: vscode.Uri) => {
  const candidates: vscode.Uri[] = [];

  if (typeDefUri) {
    const extensions = ['ts', 'js'];
    for (const ext of extensions) {
      const candidate = typeDefUri.with({
        path: typeDefUri.path.slice(0, -4) + ext,
      });
      candidates.push(candidate);
    }
  }
  return candidates;
};
