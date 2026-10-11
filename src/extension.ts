import * as vscode from 'vscode';

const SUPPORTED_LANGUAGES = ['python', 'javascript', 'typescript', 'javascriptreact', 'typescriptreact'];
const DEBOUNCE_DELAY = 300;

let excludePatterns: RegExp[] = [];
let excludeDeclaration: boolean = false;

function loadConfiguration(): void {
  const config = vscode.workspace.getConfiguration('referenceCounter');
  const patterns = config.get<string[]>('excludePatterns') || [];
  excludePatterns = patterns.map(pattern => new RegExp(pattern.replace(/\*/g, '.*')));
  excludeDeclaration = config.get<boolean>('excludeDeclaration') || false;
}

/**
 * A code lens that remembers which symbol it belongs to, so that the
 * reference lookup can be deferred to resolveCodeLens.
 */
class ReferenceCodeLens extends vscode.CodeLens {
  constructor(
    range: vscode.Range,
    public readonly uri: vscode.Uri,
    public readonly position: vscode.Position
  ) {
    super(range);
  }
}

class ReferenceCounterProvider implements vscode.CodeLensProvider<ReferenceCodeLens> {
  private readonly changeEmitter = new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses = this.changeEmitter.event;

  public refresh(): void {
    this.changeEmitter.fire();
  }

  public dispose(): void {
    this.changeEmitter.dispose();
  }

  async provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): Promise<ReferenceCodeLens[]> {
    try {
      loadConfiguration();

      const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
        'vscode.executeDocumentSymbolProvider',
        document.uri
      );

      if (token.isCancellationRequested || !symbols || !Array.isArray(symbols)) {
        return [];
      }

      return collectSymbols(symbols).map(symbol => {
        const line = symbol.selectionRange.start.line;
        return new ReferenceCodeLens(
          new vscode.Range(line, 0, line, 0),
          document.uri,
          symbol.selectionRange.start
        );
      });
    } catch (error) {
      console.error('Reference Counter: Error providing code lenses:', error);
      return [];
    }
  }

  async resolveCodeLens(
    codeLens: ReferenceCodeLens,
    token: vscode.CancellationToken
  ): Promise<ReferenceCodeLens> {
    const references = await getReferences(codeLens.uri, codeLens.position);

    if (token.isCancellationRequested) {
      return codeLens;
    }

    const count = references.length;

    codeLens.command = {
      title: `${count} ${count === 1 ? 'reference' : 'references'}`,
      tooltip: count > 0 ? 'Show all references' : 'No references found',
      command: count > 0 ? 'referenceCounter.showReferences' : '',
      arguments: [codeLens.uri, codeLens.position, references],
    };

    return codeLens;
  }
}

/**
 * Top level symbols plus the methods of any class, matching the set of
 * symbols the extension has always counted.
 */
function collectSymbols(symbols: vscode.DocumentSymbol[]): vscode.DocumentSymbol[] {
  const collected: vscode.DocumentSymbol[] = [];

  for (const symbol of symbols) {
    collected.push(symbol);

    if (symbol.kind === vscode.SymbolKind.Class) {
      collected.push(...symbol.children.filter(child => child.kind === vscode.SymbolKind.Method));
    }
  }

  return collected;
}

async function getReferences(
  uri: vscode.Uri,
  position: vscode.Position
): Promise<vscode.Location[]> {
  try {
    const references = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeReferenceProvider',
      uri,
      position
    );

    if (!references || !Array.isArray(references)) {
      return [];
    }

    let filtered = references.filter(ref =>
      !excludePatterns.some(regex => regex.test(ref.uri.path))
    );

    if (excludeDeclaration) {
      filtered = filtered.filter(ref =>
        !(ref.uri.toString() === uri.toString() && ref.range.start.isEqual(position))
      );
    }

    return filtered;
  } catch (error) {
    console.error('Reference Counter: Error getting references:', error);
    return [];
  }
}

export function activate(context: vscode.ExtensionContext) {
  loadConfiguration();

  const provider = new ReferenceCounterProvider();
  context.subscriptions.push(provider);

  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      SUPPORTED_LANGUAGES.map(language => ({ language, scheme: 'file' })),
      provider
    )
  );

  // Opens the peek references view on the symbol the lens belongs to.
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'referenceCounter.showReferences',
      async (uri: vscode.Uri, position: vscode.Position, locations: vscode.Location[]) => {
        await vscode.commands.executeCommand('editor.action.showReferences', uri, position, locations);
      }
    )
  );

  // Debounced refresh while typing, so counts follow the code being written.
  let updateTimeout: NodeJS.Timeout | undefined;
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (!SUPPORTED_LANGUAGES.includes(event.document.languageId)) {
        return;
      }

      if (updateTimeout) {
        clearTimeout(updateTimeout);
      }

      updateTimeout = setTimeout(() => provider.refresh(), DEBOUNCE_DELAY);
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('referenceCounter')) {
        loadConfiguration();
        provider.refresh();
      }
    })
  );
}

export function deactivate() {}
