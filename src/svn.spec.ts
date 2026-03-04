import * as assert from "assert";
import sinon from "sinon";
import { LogOutputChannel, workspace } from "vscode";

import { CredentialManager } from "./credential-manager";
import { NotWorkingCopyError } from "./errors/not-working-copy-error";
import { SVN } from "./svn";

// Dummy class to allow `createStubInstance` on the `LogOutputChannel` interface.
class DummyLogOutputChannel {
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

suite("SVN Test Suite", () => {
    let svn: SVN;
    let loggerMock: sinon.SinonStubbedInstance<LogOutputChannel>;
    let credentialManagerMock: sinon.SinonStubbedInstance<CredentialManager>;
    const sandbox = sinon.createSandbox();

    setup(() => {
        loggerMock = sandbox.createStubInstance(
            DummyLogOutputChannel,
        ) as unknown as sinon.SinonStubbedInstance<LogOutputChannel>;
        Object.defineProperty(loggerMock, "name", { value: "mock-logger", writable: true });
        Object.defineProperty(loggerMock, "logLevel", { value: 1, writable: true });

        credentialManagerMock = sandbox.createStubInstance(CredentialManager);

        // Mock workspace configuration
        sandbox.stub(workspace, "getConfiguration").returns({
            get: sandbox.stub(),
            has: sandbox.stub(),
            inspect: sandbox.stub(),
            update: sandbox.stub(),
            svnExecutablePath: "svn",
        } as any);

        svn = new SVN(loggerMock, credentialManagerMock as any);
    });

    teardown(() => {
        sandbox.restore();
    });

    suite("Error Handling", () => {
        test("should throw NotWorkingCopyError when svn command encounters E155007", async () => {
            const errorString =
                "svn: warning: W155007: '/mock/path/to/file' is not a working copy\nsvn: E155007: '/mock/path/to/file' is not a working copy";
            // Mock execSvn instead of the module export to bypass import issues
            sandbox.stub(svn as any, "execSvn").rejects(new Error(errorString));

            const testFileName = "/mock/path/to/file";

            await assert.rejects(
                async () => {
                    await svn.blameFile(testFileName);
                },
                (err: unknown) => {
                    return err instanceof NotWorkingCopyError && err.fileName === testFileName;
                },
                "Expected blameFile to throw NotWorkingCopyError",
            );

            // Also verify that we log the warning
            assert.ok(
                loggerMock.warn.calledWith("File is not a working copy, cannot complete action"),
                "Warning should be logged",
            );
        });
    });
});
