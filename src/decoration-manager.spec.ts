import * as assert from "assert";
import sinon from "sinon";
import { Range, TextEditor, TextEditorDecorationType } from "vscode";

import { EXTENSION_CONFIGURATION } from "./const/extension";
import { MAX_NUMBER } from "./const/number";
import { DecorationManager } from "./decoration-manager";
import { mapBlameToHoverMessage } from "./mapping/map-blame-to-hover-message";
import { Blame } from "./types/blame.model";

suite("DecorationManager", () => {
    let decorationManager: DecorationManager;
    const sandbox = sinon.createSandbox();
    let getExtensionStub: sinon.SinonStub;
    let getConfigurationStub: sinon.SinonStub;

    setup(() => {
        // Stub extensions and workspace so constructor doesn't fail
        const vscode = require("vscode");
        getExtensionStub = sandbox
            .stub(vscode.extensions, "getExtension")
            .returns({ extensionPath: "/test/path" });
        getConfigurationStub = sandbox
            .stub(vscode.workspace, "getConfiguration")
            .returns({ enableVisualIndicators: true });

        decorationManager = new DecorationManager();
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

    test("uses resolved icon paths without joining the image directory again", () => {
        const vscode = require("vscode");
        const decoration = {} as TextEditorDecorationType;
        const createDecorationStub = sandbox
            .stub(vscode.window, "createTextEditorDecorationType")
            .returns(decoration);

        const result = decorationManager.createGutterDecorationType(
            "/test/path/dist/img/indicators/standard/blue/0000.svg",
        );

        assert.strictEqual(result, decoration);
        assert.deepStrictEqual(
            createDecorationStub.firstCall.args[0].gutterIconPath,
            "/test/path/dist/img/indicators/standard/blue/0000.svg",
        );
    });

    test("assigns blue icons from oldest to newest", async () => {
        getExtensionStub.returns({ extensionPath: process.cwd() });
        getConfigurationStub.returns({
            enableVisualIndicators: true,
            indicatorColorScheme: "blue",
        });
        decorationManager = new DecorationManager();

        const icons = await decorationManager.createGutterImagePathHashMap(
            "/workspace/example.ts",
            ["30", "10", "20"],
        );

        assert.ok(icons["10"]?.endsWith("/blue/0000.svg"));
        assert.ok(icons["20"]?.endsWith("/blue/0250.svg"));
        assert.ok(icons["30"]?.endsWith("/blue/0499.svg"));
        assert.ok(
            getConfigurationStub.calledWith(
                EXTENSION_CONFIGURATION,
                sinon.match({ fsPath: "/workspace/example.ts" }),
            ),
        );
    });

    test("uses the original document URI to resolve indicator settings", async () => {
        getExtensionStub.returns({ extensionPath: process.cwd() });
        getConfigurationStub.returns({
            enableVisualIndicators: true,
            indicatorColorScheme: "blue",
        });
        decorationManager = new DecorationManager();
        const remoteUri = {
            fsPath: "/workspace/example.ts",
            scheme: "vscode-remote",
        } as unknown as import("vscode").Uri;

        await decorationManager.createGutterImagePathHashMap(
            "/workspace/example.ts",
            ["10", "20"],
            remoteUri,
        );

        assert.ok(getConfigurationStub.calledWithExactly(EXTENSION_CONFIGURATION, remoteUri));
    });

    test("uses the selected chronological colour scheme", async () => {
        getExtensionStub.returns({ extensionPath: process.cwd() });
        decorationManager = new DecorationManager();

        for (const scheme of [
            "redToGreen",
            "sky",
            "teal",
            "violet",
            "orange",
            "vermilion",
        ] as const) {
            getConfigurationStub.returns({
                enableVisualIndicators: true,
                indicatorColorScheme: scheme,
            });

            const icons = await decorationManager.createGutterImagePathHashMap(
                "/workspace/example.ts",
                ["10", "20"],
            );

            assert.ok(icons["10"]?.endsWith(`/${scheme}/0000.svg`));
            assert.ok(icons["20"]?.endsWith(`/${scheme}/0499.svg`));
        }
    });

    test("keeps contrast-first random icons stable for a file", async () => {
        getExtensionStub.returns({ extensionPath: process.cwd() });
        getConfigurationStub.returns({
            enableVisualIndicators: true,
            indicatorColorScheme: "random",
        });
        decorationManager = new DecorationManager();

        const revisions = Array.from({ length: 12 }, (_, index) => `${index + 1}`);
        const first = await decorationManager.createGutterImagePathHashMap(
            "/workspace/example.ts",
            revisions,
        );
        const second = await decorationManager.createGutterImagePathHashMap(
            "/workspace/example.ts",
            revisions,
        );

        assert.deepStrictEqual(first, second);
        assert.strictEqual(new Set(Object.values(first)).size, 12);
    });
});
