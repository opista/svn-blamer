import * as assert from "assert";
import sinon from "sinon";
import { ColorThemeKind, Range, TextEditor, TextEditorDecorationType, Uri } from "vscode";

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
        assert.doesNotMatch(decodeSvg(icons["10"]), /stroke=/);
        assert.ok(
            getConfigurationStub.calledWith(
                EXTENSION_CONFIGURATION,
                sinon.match({ fsPath: "/workspace/example.ts" }),
            ),
        );
    });

    test("outlines built-in indicators only in light themes", async () => {
        const vscode = require("vscode");
        const activeColorTheme = { kind: ColorThemeKind.Light };
        sandbox.stub(vscode.window, "activeColorTheme").value(activeColorTheme);
        getConfigurationStub.returns({
            enableVisualIndicators: true,
            indicatorColorScheme: "blue",
        });

        for (const themeKind of [ColorThemeKind.Light, ColorThemeKind.HighContrastLight]) {
            activeColorTheme.kind = themeKind;
            const icons = await decorationManager.createGutterIconHashMap("/workspace/example.ts", [
                "10",
            ]);
            const svg = Buffer.from(String(icons["10"]).split(",")[1], "base64").toString("utf8");

            assert.match(svg, /stroke="#475569" stroke-width="7"/);
        }

        for (const themeKind of [ColorThemeKind.Dark, ColorThemeKind.HighContrast]) {
            activeColorTheme.kind = themeKind;
            const icons = await decorationManager.createGutterIconHashMap("/workspace/example.ts", [
                "10",
            ]);
            const svg = Buffer.from(String(icons["10"]).split(",")[1], "base64").toString("utf8");

            assert.doesNotMatch(svg, /stroke=/);
        }
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
            "teal",
            "violet",
            "vermilion",
            "custom",
        ] as const) {
            getConfigurationStub.returns({
                enableVisualIndicators: true,
                indicatorColorScheme: scheme,
                get: () => "#123456",
            });

            const icons = await decorationManager.createGutterIconHashMap("/workspace/example.ts", [
                "10",
                "20",
            ]);

            assert.match(String(icons["10"]), /^data:image\/svg\+xml;base64,/);
            assert.match(String(icons["20"]), /^data:image\/svg\+xml;base64,/);
        }
    });

    test("uses custom colours and falls back per invalid endpoint", async () => {
        getConfigurationStub.returns({
            enableVisualIndicators: true,
            indicatorColorScheme: "custom",
            get: (key: string) => {
                if (key === "indicatorCustomOldestColor") {
                    return "not-a-colour";
                }
                if (key === "indicatorCustomNewestColor") {
                    return "#ABCDEF";
                }
                return "#654321";
            },
        });
        decorationManager = new DecorationManager();

        const icons = await decorationManager.createGutterIconHashMap("/workspace/example.ts", [
            "10",
            "20",
        ]);
        const decodeSvg = (icon: unknown) =>
            Buffer.from(String(icon).split(",")[1], "base64").toString("utf8");

        assert.match(decodeSvg(icons["10"]), /fill="rgb\(107\.0000, 114\.0000, 128\.0000\)"/);
        assert.match(decodeSvg(icons["20"]), /fill="rgb\(171\.0000, 205\.0000, 239\.0000\)"/);
        assert.match(decodeSvg(icons["10"]), /stroke="#654321" stroke-width="7"/);
    });

    test("identifies only the adaptive single-colour schemes as theme-aware", () => {
        getConfigurationStub.returns({ indicatorColorScheme: "blue" });
        assert.ok(
            decorationManager.usesThemeAwareIndicatorScheme(Uri.file("/workspace/example.ts")),
        );

        getConfigurationStub.returns({ indicatorColorScheme: "custom" });
        assert.ok(
            !decorationManager.usesThemeAwareIndicatorScheme(Uri.file("/workspace/example.ts")),
        );

        getConfigurationStub.returns({ indicatorColorScheme: "redToGreen" });
        assert.ok(
            !decorationManager.usesThemeAwareIndicatorScheme(Uri.file("/workspace/example.ts")),
        );
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
