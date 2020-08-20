import * as path from 'path'
import * as vscode from 'vscode'

export function getActiveDocumentPath() {
  return path.normalize(
    vscode.window.activeTextEditor?.document.uri.path as string
  );
}

// there's a quirk with uri.path in that it adds a `/` in front of the path... maybe this is Windows-only? anyway we need to adapt the test a bit for it to pass
export function getFormattedPath(filePath: string) {
  return `\\${path.resolve(__dirname, filePath)}`;
}
