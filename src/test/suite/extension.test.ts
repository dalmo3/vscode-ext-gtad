import * as assert from 'assert';
import * as vscode from 'vscode';
// import * as myExtension from '../../extension';
import { before } from 'mocha';
import { pathToFileURL } from 'url';
import * as path from 'path';
import { executeDocumentSymbolProvider } from '../../executeCommand';

const THIS_DOC_PATH = __filename;
const THIS_DOC_URI = vscode.Uri.file(THIS_DOC_PATH);
const gtad = vscode.extensions.getExtension('vscode-ext-gtad');

suite('Extension Test Suite', () => {
  vscode.window.showInformationMessage('Start all tests.');

  test('It runs', () => {
    assert.equal(-1, [1, 2, 3].indexOf(5));
    assert.equal(-1, [1, 2, 3].indexOf(0));
  });
});

suite('Unit tests', () => {
  // todo: add unit tests for the helper functions (commands, etc)
});

suite('End to End tests', () => {
  let document: vscode.TextDocument;
  let editor: vscode.TextEditor;

  before(async () => {
    gtad?.activate();
  });

  // launch.json is set to open this file when running tests
  test('should open this document on startup', async () => {
    const targetPath = getFormattedPath(
      '../../../src/test/suite/extension.test.ts'
    );

    assert.strictEqual(getActiveDocumentPath(), targetPath);
  });

  test('should open the example .ts document', async () => {
    const targetPath = getFormattedPath(
      '../../../src/test/suite/files/exampleUsage.ts'
    );
    document = await vscode.workspace.openTextDocument(targetPath);
    editor = await vscode.window.showTextDocument(document);

    assert.strictEqual(getActiveDocumentPath(), targetPath);
  });

  test('should find the document symbols', async () => {
    const docSymbols = await executeDocumentSymbolProvider(
      vscode.window.activeTextEditor?.document.uri!
    );

    assert.notStrictEqual(docSymbols, []);
  });
});

function getActiveDocumentPath() {
  return path.normalize(
    vscode.window.activeTextEditor?.document.uri.path as string
  );
}

// there's a quirk with uri.path in that it adds a `/` in front of the path... maybe this is Windows-only? anyway we need to adapt the test a bit for it to pass
function getFormattedPath(filePath: string) {
  return `\\${path.resolve(__dirname, filePath)}`;
}
