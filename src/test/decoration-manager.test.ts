import * as assert from "assert";
import sinon from "sinon";
import { Range, TextEditor, TextEditorDecorationType } from "vscode";

import { MAX_NUMBER } from "../const/number";
import { ConfigurationManager } from "../configuration-manager";
import { DecorationManager } from "../decoration-manager";
import { mapBlameToHoverMessage } from "../mapping/map-blame-to-hover-message";
import { Blame } from "../types/blame.model";

suite("DecorationManager", () => {
    let decorationManager: DecorationManager;
    const sandbox = sinon.createSandbox();

    setup(() => {
        // Stub extensions and workspace so constructor doesn't fail
        const vscode = require("vscode");
        sandbox.stub(vscode.extensions, "getExtension").returns({ extensionPath: "/test/path" });

        const configurationManagerMock = {
            config: {
                autoBlame: false,
                enableLogs: true,
                enableVisualIndicators: true,
                viewportBuffer: 200,
                svnExecutablePath: "svn",
            },
            dispose: sandbox.stub(),
        } as unknown as ConfigurationManager;

        decorationManager = new DecorationManager(configurationManagerMock);
    });

    teardown(() => {
        sandbox.restore();
    });

    test("setActiveLineDecoration should attach hoverMessage to the active line decoration", () => {
        const mockTextEditor = {
            setDecorations: sandbox.spy(),
        } as unknown as TextEditor;

        const blame: Blame = {
            author: "test_author",
            date: "2026-02-24T00:00:00.000Z",
            line: "5",
            revision: "12345",
        };

        const log = "This is a test log message";
        const expectedDecorationType = {} as TextEditorDecorationType;

        sandbox
            .stub(decorationManager, "createActiveLineDecorationType")
            .returns(expectedDecorationType);

        const decoration = decorationManager.setActiveLineDecoration(mockTextEditor, blame, log);

        assert.strictEqual(decoration, expectedDecorationType);

        const hoverMessageText = mapBlameToHoverMessage(blame, log);

        const lineNumber = 4; // blame.line is "5", 1-indexed

        const setDecorationsSpy = mockTextEditor.setDecorations as sinon.SinonSpy;
        assert.ok(setDecorationsSpy.calledOnce);
        const [actualDecorationType, actualDecorationOptions] = setDecorationsSpy.getCall(0).args;

        assert.strictEqual(actualDecorationType, expectedDecorationType);
        assert.deepStrictEqual(actualDecorationOptions, [
            {
                range: new Range(lineNumber, MAX_NUMBER, lineNumber, MAX_NUMBER),
            },
        ]);
    });
});
