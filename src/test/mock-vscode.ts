import * as Module from "module";

const originalRequire = Module.prototype.require;

const vscodeMock = {
    window: {
        createStatusBarItem: () => ({
            show: () => {},
            hide: () => {},
            dispose: () => {},
            text: "",
        }),
        activeTextEditor: undefined,
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
        fs: {
            stat: () => Promise.resolve(),
        },
    },
    commands: {
        executeCommand: () => Promise.resolve(),
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
    StatusBarAlignment: { Left: 1, Right: 2 },
    extensions: {
        getExtension: () => ({ extensionPath: "/test/path" }),
    },
    ThemeColor: class ThemeColor {
        constructor(public id: string) {}
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
