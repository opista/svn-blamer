import * as assert from "assert";
import sinon from "sinon";
import { Range, TextEditor, TextEditorDecorationType, Uri } from "vscode";

import { EXTENSION_CONFIGURATION } from "./const/extension";
import { MAX_NUMBER } from "./const/number";
import { DecorationManager } from "./decoration-manager";
import { mapBlameToHoverMessage } from "./mapping/map-blame-to-hover-message";
import { Blame } from "./types/blame.model";

suite("DecorationManager", () => {
    let decorationManager: DecorationManager;
    const sandbox = sinon.createSandbox();
    let getConfigurationStub: sinon.SinonStub;

    setup(() => {
        const vscode = require("vscode");
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

    test("passes an SVG data URI directly to the gutter decoration", () => {
        const vscode = require("vscode");
        const decoration = {} as TextEditorDecorationType;
        const createDecorationStub = sandbox
            .stub(vscode.window, "createTextEditorDecorationType")
            .returns(decoration);
        const icon = Uri.parse("data:image/svg+xml;base64,PHN2Zy8+");

        const result = decorationManager.createGutterDecorationType(icon);

        assert.strictEqual(result, decoration);
        assert.strictEqual(createDecorationStub.firstCall.args[0].gutterIconPath, icon);
    });

    test("assigns blue SVG data URIs from oldest to newest", async () => {
        getConfigurationStub.returns({
            enableVisualIndicators: true,
            indicatorColorScheme: "blue",
        });
        decorationManager = new DecorationManager();

        const icons = await decorationManager.createGutterIconHashMap("/workspace/example.ts", [
            "30",
            "10",
            "20",
        ]);

        assert.match(String(icons["10"]), /^data:image\/svg\+xml;base64,/);
        assert.match(String(icons["20"]), /^data:image\/svg\+xml;base64,/);
        assert.match(String(icons["30"]), /^data:image\/svg\+xml;base64,/);

        const decodeSvg = (icon: unknown) =>
            Buffer.from(String(icon).split(",")[1], "base64").toString("utf8");

        assert.match(decodeSvg(icons["10"]), /fill="rgb\(255\.0000, 255\.0000, 255\.0000\)"/);
        assert.match(decodeSvg(icons["30"]), /fill="rgb\(31\.0000, 95\.0000, 159\.0000\)"/);
        assert.ok(
            getConfigurationStub.calledWith(
                EXTENSION_CONFIGURATION,
                sinon.match({ fsPath: "/workspace/example.ts" }),
            ),
        );
    });

    test("uses the original document URI to resolve indicator settings", async () => {
        getConfigurationStub.returns({
            enableVisualIndicators: true,
            indicatorColorScheme: "blue",
        });
        decorationManager = new DecorationManager();
        const remoteUri = {
            fsPath: "/workspace/example.ts",
            scheme: "vscode-remote",
        } as unknown as import("vscode").Uri;

        await decorationManager.createGutterIconHashMap(
            "/workspace/example.ts",
            ["10", "20"],
            remoteUri,
        );

        assert.ok(getConfigurationStub.calledWithExactly(EXTENSION_CONFIGURATION, remoteUri));
    });

    test("does not read indicator icons from the filesystem", async () => {
        decorationManager = new DecorationManager();
        const fsPromises = require("node:fs/promises");
        const readdirSpy = sandbox.spy(fsPromises, "readdir");

        for (const scheme of ["blue", "random"]) {
            getConfigurationStub.returns({
                enableVisualIndicators: true,
                indicatorColorScheme: scheme,
            });
            await decorationManager.createGutterIconHashMap("/workspace/example.ts", ["10"]);
        }

        assert.strictEqual(readdirSpy.callCount, 0);
    });

    test("creates at most the chronological URIs in use and reuses them", async () => {
        const vscode = require("vscode");
        const parseSpy = sandbox.spy(vscode.Uri, "parse");
        getConfigurationStub.returns({
            enableVisualIndicators: true,
            indicatorColorScheme: "blue",
        });
        decorationManager = new DecorationManager();
        const revisions = Array.from({ length: 20 }, (_, index) => `${index + 1}`);

        const first = await decorationManager.createGutterIconHashMap(
            "/workspace/example.ts",
            revisions,
        );
        const createdForFirstBlame = parseSpy.callCount;
        const second = await decorationManager.createGutterIconHashMap(
            "/workspace/example.ts",
            revisions,
        );

        assert.ok(createdForFirstBlame <= revisions.length);
        assert.strictEqual(parseSpy.callCount, createdForFirstBlame);
        assert.strictEqual(first["1"], second["1"]);
        assert.strictEqual(first["20"], second["20"]);
    });

    test("uses SVG data URIs for every chronological colour scheme", async () => {
        decorationManager = new DecorationManager();

        for (const scheme of [
            "redToGreen",
            "blue",
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

            const icons = await decorationManager.createGutterIconHashMap("/workspace/example.ts", [
                "10",
                "20",
            ]);

            assert.match(String(icons["10"]), /^data:image\/svg\+xml;base64,/);
            assert.match(String(icons["20"]), /^data:image\/svg\+xml;base64,/);
        }
    });

    test("keeps contrast-first random icons stable for a file", async () => {
        getConfigurationStub.returns({
            enableVisualIndicators: true,
            indicatorColorScheme: "random",
        });
        decorationManager = new DecorationManager();

        const revisions = Array.from({ length: 12 }, (_, index) => `${index + 1}`);
        const first = await decorationManager.createGutterIconHashMap(
            "/workspace/example.ts",
            revisions,
        );
        const second = await decorationManager.createGutterIconHashMap(
            "/workspace/example.ts",
            revisions,
        );

        assert.deepStrictEqual(first, second);
        assert.strictEqual(new Set(Object.values(first)).size, 12);
        assert.ok(
            Object.values(first).every((icon) =>
                String(icon).startsWith("data:image/svg+xml;base64,"),
            ),
        );
    });
});
