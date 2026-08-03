import * as assert from "assert";
import sinon from "sinon";
import {
    ColorTheme,
    ColorThemeKind,
    commands,
    ConfigurationChangeEvent,
    Disposable,
    ExtensionContext,
    window,
    workspace,
} from "vscode";

import { Blamer } from "./blamer";
import { activate } from "./extension";
import * as indicatorUris from "./indicator-uris";

suite("Extension", () => {
    const sandbox = sinon.createSandbox();

    teardown(() => {
        sandbox.restore();
    });

    test("refreshes indicators after the colour scheme configuration change settles", async () => {
        let configurationListener: ((event: ConfigurationChangeEvent) => void) | undefined;
        let themeListener: ((theme: ColorTheme) => void) | undefined;
        const refresh = sandbox.stub(Blamer.prototype, "refreshVisibleBlameIndicators").resolves();
        sandbox.stub(Blamer.prototype, "refreshThemeAwareVisibleBlameIndicators").resolves();
        const clearCache = sandbox.stub(indicatorUris, "clearIndicatorUriCache");

        sandbox.stub(commands, "registerCommand").returns({ dispose: () => {} } as Disposable);
        sandbox.stub(workspace, "onDidChangeConfiguration").callsFake((listener) => {
            configurationListener = listener;
            return { dispose: () => {} } as Disposable;
        });
        sandbox.stub(window, "onDidChangeActiveColorTheme").callsFake((listener) => {
            themeListener = listener;
            return { dispose: () => {} } as Disposable;
        });

        await activate({ subscriptions: [] } as unknown as ExtensionContext);

        configurationListener?.({
            affectsConfiguration: (section: string) => section === "svnBlamer.indicatorColorScheme",
        } as ConfigurationChangeEvent);

        assert.ok(refresh.notCalled, "does not read the configuration during its change event");

        await new Promise<void>((resolve) => queueMicrotask(resolve));

        assert.ok(refresh.calledOnce);
        assert.ok(clearCache.calledOnce);
        assert.ok(themeListener, "registers a theme change listener");
    });

    test("refreshes indicators when a custom colour setting changes", async () => {
        let configurationListener: ((event: ConfigurationChangeEvent) => void) | undefined;
        const refresh = sandbox.stub(Blamer.prototype, "refreshVisibleBlameIndicators").resolves();
        sandbox.stub(Blamer.prototype, "refreshThemeAwareVisibleBlameIndicators").resolves();
        sandbox.stub(indicatorUris, "clearIndicatorUriCache");
        sandbox.stub(commands, "registerCommand").returns({ dispose: () => {} } as Disposable);
        sandbox.stub(workspace, "onDidChangeConfiguration").callsFake((listener) => {
            configurationListener = listener;
            return { dispose: () => {} } as Disposable;
        });
        sandbox
            .stub(window, "onDidChangeActiveColorTheme")
            .returns({ dispose: () => {} } as Disposable);

        await activate({ subscriptions: [] } as unknown as ExtensionContext);

        for (const setting of [
            "svnBlamer.indicatorCustomOldestColor",
            "svnBlamer.indicatorCustomNewestColor",
            "svnBlamer.indicatorCustomOutlineColor",
        ]) {
            configurationListener?.({
                affectsConfiguration: (section: string) => section === setting,
            } as ConfigurationChangeEvent);
            await new Promise<void>((resolve) => queueMicrotask(resolve));
        }

        assert.strictEqual(refresh.callCount, 3);
    });

    test("refreshes only theme-aware indicators when the active theme changes", async () => {
        let themeListener: ((theme: ColorTheme) => void) | undefined;
        sandbox.stub(Blamer.prototype, "refreshVisibleBlameIndicators").resolves();
        const refreshThemeAware = sandbox
            .stub(Blamer.prototype, "refreshThemeAwareVisibleBlameIndicators")
            .resolves();
        const clearCache = sandbox.stub(indicatorUris, "clearIndicatorUriCache");
        sandbox.stub(commands, "registerCommand").returns({ dispose: () => {} } as Disposable);
        sandbox
            .stub(workspace, "onDidChangeConfiguration")
            .returns({ dispose: () => {} } as Disposable);
        sandbox.stub(window, "onDidChangeActiveColorTheme").callsFake((listener) => {
            themeListener = listener;
            return { dispose: () => {} } as Disposable;
        });

        await activate({ subscriptions: [] } as unknown as ExtensionContext);
        themeListener?.({ kind: ColorThemeKind.Dark });

        assert.ok(refreshThemeAware.calledOnce);
        assert.ok(clearCache.calledOnce);
    });
});
