import * as assert from "assert";
import sinon from "sinon";
import {
    commands,
    ConfigurationChangeEvent,
    Disposable,
    ExtensionContext,
    workspace,
} from "vscode";

import { Blamer } from "./blamer";
import { activate } from "./extension";

suite("Extension", () => {
    const sandbox = sinon.createSandbox();

    teardown(() => {
        sandbox.restore();
    });

    test("refreshes indicators after the colour scheme configuration change settles", async () => {
        let configurationListener: ((event: ConfigurationChangeEvent) => void) | undefined;
        const refresh = sandbox.stub(Blamer.prototype, "refreshVisibleBlameIndicators").resolves();

        sandbox.stub(commands, "registerCommand").returns({ dispose: () => {} } as Disposable);
        sandbox.stub(workspace, "onDidChangeConfiguration").callsFake((listener) => {
            configurationListener = listener;
            return { dispose: () => {} } as Disposable;
        });

        await activate({ subscriptions: [] } as unknown as ExtensionContext);

        configurationListener?.({
            affectsConfiguration: (section: string) => section === "svnBlamer.indicatorColorScheme",
        } as ConfigurationChangeEvent);

        assert.ok(refresh.notCalled, "does not read the configuration during its change event");

        await new Promise<void>((resolve) => queueMicrotask(resolve));

        assert.ok(refresh.calledOnce);
    });
});
