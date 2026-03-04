import * as assert from "assert";
import sinon from "sinon";
import { LogOutputChannel, workspace } from "vscode";

import { CredentialManager } from "../credential-manager";
import { NotWorkingCopyError } from "../errors/not-working-copy-error";
import { SVN } from "../svn";

suite("SVN Test Suite", () => {
    let svn: SVN;
    let loggerMock: sinon.SinonStubbedInstance<LogOutputChannel>;
    let credentialManagerMock: sinon.SinonStubbedInstance<CredentialManager>;
    const sandbox = sinon.createSandbox();

    setup(() => {
        // LogOutputChannel is an interface in VS Code API, we cannot use createStubInstance.
        // We will cast a generic object but with explicitly typed stubs for clarity if needed,
        // however the PR comment specifically requests using createStubInstance which is technically
        // impossible for interfaces in Sinon unless we provide a class. Let's create a dummy class
        // or just supply an object with the properties.

        // As a workaround to satisfy the request while keeping TypeScript happy:
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

        loggerMock = sandbox.createStubInstance(DummyLogOutputChannel) as unknown as sinon.SinonStubbedInstance<LogOutputChannel>;
        Object.defineProperty(loggerMock, "name", { value: "mock-logger", writable: true });
        Object.defineProperty(loggerMock, "logLevel", { value: 1, writable: true });

        credentialManagerMock = sandbox.createStubInstance(CredentialManager);

        // Mock workspace configuration
        const configGetStub = sandbox.stub();
        configGetStub.withArgs("svnExecutablePath").returns("svn");
        sandbox.stub(workspace, "getConfiguration").returns({
            get: configGetStub,
            has: sandbox.stub().returns(true),
            inspect: sandbox.stub(),
            update: sandbox.stub(),
        } as any);

        svn = new SVN(loggerMock, credentialManagerMock as any);
    });

    teardown(() => {
        sandbox.restore();
    });

    suite("Error Handling", () => {
        test("should throw NotWorkingCopyError when svn command encounters E155007", async () => {
            const errorString = "svn: warning: W155007: '/mock/path/to/file' is not a working copy\nsvn: E155007: '/mock/path/to/file' is not a working copy";
            // Mock execSvn instead of the module export to bypass import issues
            sandbox.stub(svn as any, "execSvn").rejects(new Error(errorString));

            const testFileName = "/mock/path/to/file";

            await assert.rejects(
                async () => {
                    await svn.blameFile(testFileName);
                },
                (err: unknown) => {
                    assert.strictEqual(
                        err instanceof NotWorkingCopyError,
                        true,
                        `Error thrown should be instance of NotWorkingCopyError, but got ${err}`,
                    );
                    assert.strictEqual(
                        (err as NotWorkingCopyError).fileName,
                        testFileName,
                        "Error should contain correct fileName",
                    );
                    return true;
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
