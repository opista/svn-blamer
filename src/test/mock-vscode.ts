import * as Module from "module";

const originalRequire = Module.prototype.require;

const vscodeMock = {
    window: {
        createOutputChannel: () => ({
            clear: () => {},
            debug: () => {},
            dispose: () => {},
            error: () => {},
            info: () => {},
            trace: () => {},
            warn: () => {},
        }),
        createTextEditorDecorationType: () => ({}),
        createStatusBarItem: () => ({
            show: () => {},
            hide: () => {},
            dispose: () => {},
            text: "",
        }),
        activeTextEditor: undefined,
        visibleTextEditors: [],
        onDidChangeActiveTextEditor: () => ({ dispose: () => {} }),
        onDidChangeTextEditorSelection: () => ({ dispose: () => {} }),
        onDidChangeTextEditorVisibleRanges: () => ({ dispose: () => {} }),
        showWarningMessage: () => {},
        showErrorMessage: () => {},
        showInformationMessage: () => {},
        showInputBox: () => {},
        showQuickPick: () => {},
    },
    workspace: {
        getConfiguration: () => ({
            enableVisualIndicators: true,
            get: () => {},
        }),
        onDidChangeConfiguration: () => ({ dispose: () => {} }),
        onDidChangeTextDocument: () => ({ dispose: () => {} }),
        onDidCloseTextDocument: () => ({ dispose: () => {} }),
        fs: {
            stat: () => Promise.resolve(),
        },
    },
    commands: {
        executeCommand: () => Promise.resolve(),
        registerCommand: () => ({ dispose: () => {} }),
    },
    Range: class Range {
        constructor(
            public startLine: number,
            public startChar: number,
            public endLine: number,
            public endChar: number,
        ) {}
    },
    Position: class Position {
        constructor(
            public line: number,
            public character: number,
        ) {}
    },
    DecorationRangeBehavior: { ClosedClosed: 0 },
    StatusBarAlignment: { Left: 1, Right: 2 },
    extensions: {
        getExtension: () => ({ extensionPath: "/test/path" }),
    },
    ThemeColor: class ThemeColor {
        constructor(public id: string) {}
    },
    Uri: {
        file: (fileName: string) => ({
            fsPath: fileName,
            scheme: "file",
            toString: () => fileName,
        }),
        parse: (value: string) => ({ scheme: value.split(":", 1)[0], toString: () => value }),
    },
    Hover: class Hover {
        constructor(public contents: any) {}
    },
    MarkdownString: class MarkdownString {
        constructor(public value: string) {}
        appendMarkdown(val: string) {
            this.value += val;
            return this;
        }
    },
};

(Module.prototype as any).require = function (id: string) {
    if (id === "vscode") {
        return vscodeMock;
    }
    return originalRequire.apply(this, arguments as any);
};

// Dummy class to allow `createStubInstance` on the `LogOutputChannel` interface.
export class DummyLogOutputChannel {
    name = "mock-logger";
    logLevel = 1;
    trace() {}
    debug() {}
    info() {}
    warn() {}
    error() {}
    append() {}
    appendLine() {}
    clear() {}
    show() {}
    hide() {}
    dispose() {}
    replace() {}
    onDidChangeLogLevel() {}
}
