// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

const findAllSymbolsInCurrentDocument = async () => {
  const allSymbols = await vscode.commands.executeCommand(
    'vscode.executeDocumentSymbolProvider',
    vscode.window.activeTextEditor?.document.uri
  ) as vscode.DocumentSymbol[];
  console.log('symbols in current doc.... ', allSymbols);
  return allSymbols;
};

const findSymbolInCurrentDocument = async (symbolName: string) => {
  // find symbol def in current document
  const allSymbols = await findAllSymbolsInCurrentDocument();
  const symbolDef = allSymbols.find((s) => s.name === symbolName);
  console.log('symbol found? ', symbolDef);
  if (!symbolDef)
    return vscode.window.showInformationMessage('No definitions found!');
  //todo goto symbol declaration
  
  await vscode.commands.executeCommand('workbench.action.quickOpen',
  `@${symbolName}`);
  await vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem');
};

const openExtension = (
  symbolName: string,
  source: vscode.Uri,
  ext: string,
  extras?: string[]
) => {
  // create new Uri changing path from file.d.ts to file.ts and try to open it
  const def = source.with({
    path: source.path.slice(0, -4) + ext,
  });
  vscode.window.showTextDocument(def).then(
    async (doc) => {
      vscode.window.showInformationMessage(`Found .${ext} file`);
      await findSymbolInCurrentDocument(symbolName);
    },
    (error) => {
      vscode.window.showErrorMessage(`.${ext} not found`);
      //not found, trying next extension
      if (extras?.length) {
        const [newExt, ...newExtras] = extras;
        openExtension(symbolName, source, newExt, newExtras);
      }
    }
  );
};

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Find Symbol Extension Running....');

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand(
    'vscode-ext-hello.helloWorld',
    async () => {

      //some tests
      // findAllSymbolsInCurrentDocument();
      // await vscode.commands.executeCommand('workbench.action.gotoSymbol',
      // 'initializeDefaultAppClient');
      // await vscode.commands.executeCommand('workbench.action.quickOpen',
      // '@initializeDefaultAppClient');
      // await vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem');




      // The code you place here will be executed every time your command is executed

      // Display a message box to the user
      vscode.window.showInformationMessage(
        'Hello VS Code World from vscode-ext-hello!'
      );

      // list all possible inputs to executeCommand
      // console.log(await vscode.commands.getCommands())

      // uses native Go To Declaration command
      // await vscode.commands.executeCommand('editor.action.goToDeclaration');

      // get current editor and cursor position
      const editor = vscode.window.activeTextEditor!;
      const position = editor.selection.active;
      // console.log(position);

      // find symbol under cursor
      // method 1 - finds all references to the current symbol and filters for the current range... not very useful???
      // const symbols = (await vscode.commands.executeCommand(
      //   'vscode.executeReferenceProvider',
      //   vscode.window.activeTextEditor?.document.uri,
      //   position
      // )) as vscode.Location[];
      // console.log('symbols found', symbols);

      // const currentSymbol = symbols.filter((s) =>
      //   s.range.contains(position)
      // )[0];
      // console.log('current symbol', currentSymbol);
      // console.log('symbol text', editor.document.getText(currentSymbol.range));

      // method 2 - gets word... might need to improve word definitions
      const wordrange = editor.document.getWordRangeAtPosition(position);
      //console.log('wordrange', wordrange);

      if (!wordrange)
        return vscode.window.showInformationMessage('No text selected!');

      const currentSymbolText = editor.document.getText(wordrange);
      //console.log('wordrange text', currentSymbolText);

      if (!currentSymbolText)
        return vscode.window.showInformationMessage('No symbol selected!');

      // get built-in definitions for current symbol
      // (which is actually the Type definition, unfortunately)
      const symbolTypeDefs = (await vscode.commands.executeCommand(
        'vscode.executeDefinitionProvider',
        vscode.window.activeTextEditor?.document.uri,
        position
      )) as vscode.LocationLink[];

      if (!symbolTypeDefs.length)
        return vscode.window.showInformationMessage(
          'No type definitions found!'
        );

      // even though this is an array I believe only a single definition can ever be returned, so we get it
      // maybe in the future we could check for multiple returns and inspect each of them
      //console.log(symbolTypeDefs);
      const symbolTypeDef = symbolTypeDefs[0];

      openExtension(currentSymbolText, symbolTypeDef.targetUri, 'ts', ['js']);

      // openExtension(def.targetUri, 'ts', ['js'])

      // // try to guess declaration uri based on the type declaration uri
      // const typedef = vscode.window.activeTextEditor?.document.uri;
      // if (!typedef)
      //   return vscode.window.showErrorMessage('Declaration not found');

      // // if (typedef) {

      // openExtension(typedef, 'ts', ['js']);

      // const def_ts = typedef
      // .with({
      //   path: typedef.path.slice(0, -4) + 'ts',
      // });
      // vscode.window.showTextDocument(def_ts).then(
      //   (doc) => {
      //     vscode.window.showInformationMessage('Found .ts file');
      //     //todo goto symbol declaration
      //   },
      //   (e_ts) => {
      //     vscode.window.showErrorMessage('.ts not found');

      //     // convert file.d.ts to file.js and try to open it
      //     const def_js = typedef.with({
      //       path: typedef.path.slice(0, -4) + 'js',
      //     });
      //     vscode.window.showTextDocument(def_js).then(
      //       (doc) => {
      //         vscode.window.showInformationMessage('Found .js file');
      //         //todo goto symbol declaration
      //       },
      //       (e_js) => {
      //         vscode.window.showErrorMessage('.js not found');
      //       }
      //     );
      //   }
      // );
      // vscode.workspace.openTextDocument(def_ts).then(
      //   (doc) => {
      //   },
      //   (e_ts) => {
      //     console.log('error opening ts: ', e_ts);
      //     const def_js = typedef.with({
      //       path: typedef.path.slice(0, -4) + 'js',
      //     });
      //     console.log(def_js);
      //     vscode.workspace.openTextDocument(def_js).then(
      //       (doc) => {},
      //       (e_js) => {
      //         console.log('error opening js: ', e_js);
      //       }
      //     );
      //   }
      // );
      // }
    }
  );

  context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
