import * as assert from "assert";
import sinon from "sinon";
import { LogOutputChannel, workspace } from "vscode";

import { CredentialManager } from "./credential-manager";
import { AuthenticationError } from "./errors/authentication-error";
import { ConfigurationError } from "./errors/configuration-error";
import { NotWorkingCopyError } from "./errors/not-working-copy-error";
import { SVN } from "./svn";
import * as spawnProcessModule from "./util/spawn-process";

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
    let getConfigurationStub: sinon.SinonStub;

    setup(() => {
        loggerMock = sandbox.createStubInstance(
            DummyLogOutputChannel,
        ) as unknown as sinon.SinonStubbedInstance<LogOutputChannel>;
        Object.defineProperty(loggerMock, "name", { value: "mock-logger", writable: true });
        Object.defineProperty(loggerMock, "logLevel", { value: 1, writable: true });

        credentialManagerMock = sandbox.createStubInstance(CredentialManager);

        getConfigurationStub = sandbox.stub(workspace, "getConfiguration").returns({
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

    suite("execSvn", () => {
        let spawnProcessStub: sinon.SinonStub;

        setup(() => {
            spawnProcessStub = sandbox.stub(spawnProcessModule, "spawnProcess");
        });

        test("should execute svn command correctly", async () => {
            spawnProcessStub.resolves("success output");

            const result = await (svn as any).execSvn(["arg1", "arg2"], "/mock/cwd");

            assert.strictEqual(result, "success output");
            assert.ok(spawnProcessStub.calledOnce);
            assert.deepStrictEqual(spawnProcessStub.firstCall.args, [
                "svn",
                ["arg1", "arg2"],
                { cwd: "/mock/cwd" }
            ]);
        });

        test("should throw ConfigurationError if svnExecutablePath is missing", async () => {
            getConfigurationStub.returns({
                get: sandbox.stub(),
                has: sandbox.stub(),
                inspect: sandbox.stub(),
                update: sandbox.stub(),
                svnExecutablePath: undefined,
            } as any);

            await assert.rejects(
                async () => {
                    await (svn as any).execSvn(["arg1"], "/mock/cwd");
                },
                (err: unknown) => {
                    return err instanceof ConfigurationError;
                },
            );
        });

        test("should append auth arguments if credentials are provided and no '--' exists", async () => {
            spawnProcessStub.resolves("success output");

            await (svn as any).execSvn(["arg1"], "/mock/cwd", { user: "u", pass: "p" });

            assert.ok(spawnProcessStub.calledOnce);
            assert.deepStrictEqual(spawnProcessStub.firstCall.args[1], [
                "arg1",
                "--non-interactive",
                "--username",
                "u",
                "--password",
                "p"
            ]);
        });

        test("should insert auth arguments before '--' if it exists", async () => {
            spawnProcessStub.resolves("success output");

            await (svn as any).execSvn(["arg1", "--", "file.txt"], "/mock/cwd", { user: "u", pass: "p" });

            assert.ok(spawnProcessStub.calledOnce);
            assert.deepStrictEqual(spawnProcessStub.firstCall.args[1], [
                "arg1",
                "--non-interactive",
                "--username",
                "u",
                "--password",
                "p",
                "--",
                "file.txt"
            ]);
        });
    });

    suite("getRepositoryRoot", () => {
        let execSvnStub: sinon.SinonStub;

        setup(() => {
            execSvnStub = sandbox.stub(svn as any, "execSvn");
        });

        test("should return repository root from xml", async () => {
            execSvnStub.resolves(`<info>
    <entry>
        <repository>
            <root>https://svn.example.com/repo</root>
        </repository>
    </entry>
</info>`);

            const root = await svn.getRepositoryRoot("/mock/path/file.txt");
            assert.strictEqual(root, "https://svn.example.com/repo");
        });

        test("should handle execSvn failure and return undefined", async () => {
            execSvnStub.rejects(new Error("failed"));

            const root = await svn.getRepositoryRoot("/mock/path/file.txt");
            assert.strictEqual(root, undefined);
            assert.ok(loggerMock.warn.calledWith("Failed to get repository root"));
        });
    });

    suite("blameFile", () => {
        let execSvnStub: sinon.SinonStub;

        setup(() => {
            execSvnStub = sandbox.stub(svn as any, "execSvn");
        });

        test("should correctly parse blame output", async () => {
            const xml = `<?xml version="1.0" encoding="UTF-8"?>
<blame>
<target path="file.txt">
<entry line-number="1">
<commit revision="123">
<author>user1</author>
<date>2023-01-01T12:00:00.000000Z</date>
</commit>
</entry>
</target>
</blame>`;
            execSvnStub.resolves(xml);

            const result = await svn.blameFile("/mock/path/file.txt");

            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0].revision, "123");
            assert.strictEqual(result[0].author, "user1");
        });

        test("should log error and rethrow when execSvn fails (non-auth, non-E155007)", async () => {
            execSvnStub.rejects(new Error("Generic error"));

            await assert.rejects(
                async () => {
                    await svn.blameFile("/mock/path/file.txt");
                },
                (err: any) => err.message === "Generic error"
            );

            assert.ok(loggerMock.error.calledWith("Failed to blame file"));
        });
    });

    suite("getLogForRevision", () => {
        let execSvnStub: sinon.SinonStub;

        setup(() => {
            execSvnStub = sandbox.stub(svn as any, "execSvn");
        });

        test("should return formatted log string", async () => {
            const xml = `<?xml version="1.0" encoding="UTF-8"?>
<log>
<logentry revision="123">
<msg>Fix typo</msg>
</logentry>
</log>`;
            execSvnStub.resolves(xml);

            const result = await svn.getLogForRevision("/mock/path/file.txt", "123");
            assert.strictEqual(result, "Fix typo");
        });

        test("should throw error if execSvn fails", async () => {
            execSvnStub.rejects(new Error("Log error"));

            await assert.rejects(
                async () => {
                    await svn.getLogForRevision("/mock/path/file.txt", "123");
                },
                (err: any) => err.message === "Log error"
            );

            assert.ok(loggerMock.error.calledWith("Failed to get revision log"));
        });
    });

    suite("Error Handling", () => {
        let execSvnStub: sinon.SinonStub;

        setup(() => {
            execSvnStub = sandbox.stub(svn as any, "execSvn");
        });

        test("should throw NotWorkingCopyError when svn command encounters E155007", async () => {
            const errorString =
                "svn: warning: W155007: '/mock/path/to/file' is not a working copy\nsvn: E155007: '/mock/path/to/file' is not a working copy";
            execSvnStub.rejects(new Error(errorString));

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

            assert.ok(
                loggerMock.warn.calledWith("File is not a working copy, cannot complete action"),
                "Warning should be logged",
            );
        });

        suite("Authentication Errors", () => {
            test("should handle authentication failure and use stored credentials", async () => {
                const repoRoot = "https://svn.example.com/repo";

                // 1st call to execSvn (from blameFile -> command) fails with auth error
                execSvnStub.onFirstCall().rejects(new Error("Authentication failed"));

                // 2nd call to execSvn (from getRepositoryRoot) succeeds
                execSvnStub.onSecondCall().resolves(`<info><entry><repository><root>${repoRoot}</root></repository></entry></info>`);

                // 3rd call to execSvn (retry with stored credentials) succeeds
                execSvnStub.onThirdCall().resolves("blame output success");

                credentialManagerMock.getCredentials.resolves({ user: "u", pass: "p" });

                // Try blame file
                const promise = (svn as any).command(["blame", "file.txt"], { cwd: "/cwd", fileName: "/cwd/file.txt" });

                const result = await promise;
                assert.strictEqual(result, "blame output success");

                assert.ok(credentialManagerMock.getCredentials.calledWith(repoRoot));
                assert.ok(execSvnStub.calledThrice);
            });

            test("should prompt for credentials if no stored credentials and save on success", async () => {
                const repoRoot = "https://svn.example.com/repo";

                execSvnStub.onFirstCall().rejects(new Error("Authentication failed"));
                execSvnStub.onSecondCall().resolves(`<info><entry><repository><root>${repoRoot}</root></repository></entry></info>`);
                execSvnStub.onThirdCall().resolves("blame output success");

                credentialManagerMock.getCredentials.resolves(undefined);
                credentialManagerMock.promptForCredentials.resolves({ user: "newU", pass: "newP" });

                const promise = (svn as any).command(["blame", "file.txt"], { cwd: "/cwd", fileName: "/cwd/file.txt" });
                const result = await promise;

                assert.strictEqual(result, "blame output success");
                assert.ok(credentialManagerMock.promptForCredentials.calledWith(repoRoot));
                assert.ok(credentialManagerMock.storeCredentials.calledWith(repoRoot, "newU", "newP"));
            });

            test("should throw AuthenticationError if prompts return undefined", async () => {
                const repoRoot = "https://svn.example.com/repo";

                execSvnStub.onCall(0).rejects(new Error("Authentication failed"));
                execSvnStub.onCall(1).resolves(`<info><entry><repository><root>${repoRoot}</root></repository></entry></info>`);

                credentialManagerMock.getCredentials.resolves(undefined);
                credentialManagerMock.promptForCredentials.resolves(undefined);

                await assert.rejects(
                    async () => {
                        await (svn as any).command(["blame", "file.txt"], { cwd: "/cwd", fileName: "/cwd/file.txt" });
                    },
                    (err: any) => err instanceof AuthenticationError && err.fileName === "/cwd/file.txt"
                );
            });

            test("should throw AuthenticationError if getRepositoryRoot returns undefined", async () => {
                execSvnStub.onCall(0).rejects(new Error("Authentication failed"));
                execSvnStub.onCall(1).resolves("invalid xml"); // getRepositoryRoot fails to parse

                await assert.rejects(
                    async () => {
                        await (svn as any).command(["blame", "file.txt"], { cwd: "/cwd", fileName: "/cwd/file.txt" });
                    },
                    (err: any) => err instanceof AuthenticationError && err.fileName === "/cwd/file.txt"
                );
            });

            test("should handle nested failures during auth retry", async () => {
                const repoRoot = "https://svn.example.com/repo";

                execSvnStub.onCall(0).rejects(new Error("Authentication failed"));
                execSvnStub.onCall(1).resolves(`<info><entry><repository><root>${repoRoot}</root></repository></entry></info>`);

                // Retry also fails
                execSvnStub.onCall(2).rejects(new Error("Auth failed again"));

                credentialManagerMock.getCredentials.resolves({ user: "u", pass: "p" });

                await assert.rejects(
                    async () => {
                        await (svn as any).command(["blame", "file.txt"], { cwd: "/cwd", fileName: "/cwd/file.txt" });
                    },
                    (err: any) => err instanceof AuthenticationError && err.fileName === "/cwd/file.txt"
                );
            });
        });
    });
});
