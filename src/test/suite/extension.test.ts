import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
// import * as myExtension from '../../extension';
import { beforeEach } from 'mocha';
import { pathToFileURL } from 'url';
import * as path from 'path';

const THIS_DOC_PATH = __filename;
const THIS_DOC_URI = vscode.Uri.file(THIS_DOC_PATH);

suite('Extension Test Suite', () => {
  vscode.window.showInformationMessage('Start all tests.');

  test('It runs', () => {
    assert.equal(-1, [1, 2, 3].indexOf(5));
    assert.equal(-1, [1, 2, 3].indexOf(0));
  });
});

suite('Unit tests', () => {});

suite('End to End tests', () => {
  test('should open this document on startup', async () => {
    const openPath = path.normalize(
      vscode.window.activeTextEditor?.document.uri.path as string
    );
    const targetPath = path.resolve(
      __dirname,
      '../../../src/test/suite/extension.test.ts'
    );
    // there's a quirk with uri.path in that it adds a `/` in front of the path... maybe this is Windows-only? anyway we need to adapt the test a bit for it to pass
    assert.strictEqual(openPath, `\\${targetPath}`);
  });

  

});
