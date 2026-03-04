import * as assert from "assert";
import sinon from "sinon";
import { commands, window, workspace } from "vscode";

import { EXTENSION_CONFIGURATION, SVN_EXECUTABLE_PATH_KEY } from "./const/extension";
import { resetWarningState, warnWorkspaceExecutablePath } from "./warn-workspace-executable-path";

suite("warnWorkspaceExecutablePath Test Suite", () => {
    const sandbox = sinon.createSandbox();
    let getConfigurationStub: sinon.SinonStub;
    let showWarningMessageStub: sinon.SinonStub;
    let executeCommandStub: sinon.SinonStub;

    setup(() => {
        resetWarningState();

        showWarningMessageStub = sandbox
            .stub(window, "showWarningMessage")
            .resolves(undefined as any);
        executeCommandStub = sandbox.stub(commands, "executeCommand").resolves();

        getConfigurationStub = sandbox.stub(workspace, "getConfiguration");
    });

    teardown(() => {
        sandbox.restore();
    });

    const mockInspect = (
        values:
            | {
                  workspaceValue?: string;
                  workspaceFolderValue?: string;
                  globalValue?: string;
              }
            | undefined,
    ) => {
        getConfigurationStub.withArgs(EXTENSION_CONFIGURATION).returns({
            inspect: sandbox.stub().withArgs(SVN_EXECUTABLE_PATH_KEY).returns(values),
            get: sandbox.stub(),
            has: sandbox.stub(),
            update: sandbox.stub(),
        } as any);
    };

    test("should show warning when workspaceValue is set", () => {
        mockInspect({ workspaceValue: "/usr/bin/svn" });

        warnWorkspaceExecutablePath();

        assert.strictEqual(showWarningMessageStub.calledOnce, true);
    });

    test("should show warning when workspaceFolderValue is set", () => {
        mockInspect({ workspaceFolderValue: "/usr/bin/svn" });

        warnWorkspaceExecutablePath();

        assert.strictEqual(showWarningMessageStub.calledOnce, true);
    });

    test("should NOT show warning when only globalValue is set", () => {
        mockInspect({ globalValue: "/usr/bin/svn" });

        warnWorkspaceExecutablePath();

        assert.strictEqual(showWarningMessageStub.called, false);
    });

    test("should NOT show warning when no values are set", () => {
        mockInspect({});

        warnWorkspaceExecutablePath();

        assert.strictEqual(showWarningMessageStub.called, false);
    });

    test("should NOT show warning when inspect returns undefined", () => {
        mockInspect(undefined);

        warnWorkspaceExecutablePath();

        assert.strictEqual(showWarningMessageStub.called, false);
    });

    test("should open settings when 'Open Settings' is clicked", async () => {
        mockInspect({ workspaceValue: "/usr/bin/svn" });
        showWarningMessageStub.resolves("Open Settings" as any);

        warnWorkspaceExecutablePath();

        // Wait for the promise inside warnWorkspaceExecutablePath to resolve
        await new Promise(process.nextTick);

        assert.strictEqual(executeCommandStub.calledOnce, true);
        assert.strictEqual(executeCommandStub.firstCall.args[0], "workbench.action.openSettings");
        assert.strictEqual(
            executeCommandStub.firstCall.args[1],
            `${EXTENSION_CONFIGURATION}.${SVN_EXECUTABLE_PATH_KEY}`,
        );
    });

    test("should only warn once per session", () => {
        mockInspect({ workspaceValue: "/usr/bin/svn" });

        warnWorkspaceExecutablePath();
        warnWorkspaceExecutablePath();
        warnWorkspaceExecutablePath();

        assert.strictEqual(showWarningMessageStub.calledOnce, true);
    });
});
