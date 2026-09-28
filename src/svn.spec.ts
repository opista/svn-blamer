import * as assert from "assert";
import sinon from "sinon";
import { LogOutputChannel, workspace, WorkspaceConfiguration } from "vscode";

import { CredentialManager } from "./credential-manager";
import { AuthenticationError } from "./errors/authentication-error";
import { BinaryFileError } from "./errors/binary-file-error";
import { ConfigurationError } from "./errors/configuration-error";
import { NotWorkingCopyError } from "./errors/not-working-copy-error";
import { SvnCommandError } from "./errors/svn-command-error";
import { SVN } from "./svn";
import { DummyLogOutputChannel } from "./test/mock-vscode";
import { ICredentials } from "./types/credentials.model";
import * as spawnProcessModule from "./util/spawn-process";
import { ISpawnProcessResult } from "./util/spawn-process";

interface TestedSVN {
    execSvn(args: string[], cwd: string, credentials?: ICredentials): Promise<ISpawnProcessResult>;
    command(
        args: string[],
        params: { cwd: string; fileName: string },
    ): Promise<ISpawnProcessResult>;
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
        } as unknown as WorkspaceConfiguration);

        svn = new SVN(loggerMock, credentialManagerMock as unknown as CredentialManager);
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
            spawnProcessStub.resolves({ stdout: "success output", stderr: "" });

            const result = await (svn as unknown as TestedSVN).execSvn(
                ["arg1", "arg2"],
                "/mock/cwd",
            );

            assert.deepStrictEqual(result, { stdout: "success output", stderr: "" });
            assert.ok(spawnProcessStub.calledOnce);
            assert.deepStrictEqual(spawnProcessStub.firstCall.args, [
                "svn",
                ["arg1", "arg2"],
                { cwd: "/mock/cwd", input: undefined },
            ]);
        });

        test("should throw ConfigurationError if svnExecutablePath is missing", async () => {
            getConfigurationStub.returns({
                get: sandbox.stub(),
                has: sandbox.stub(),
                inspect: sandbox.stub(),
                update: sandbox.stub(),
                svnExecutablePath: undefined,
            } as unknown as WorkspaceConfiguration);

            await assert.rejects(
                async () => {
                    await (svn as unknown as TestedSVN).execSvn(["arg1"], "/mock/cwd");
                },
                (err: unknown) => {
                    return err instanceof ConfigurationError;
                },
            );
        });

        test("should append auth arguments if credentials are provided and no '--' exists", async () => {
            spawnProcessStub.resolves({ stdout: "success output", stderr: "" });

            await (svn as unknown as TestedSVN).execSvn(["arg1"], "/mock/cwd", {
                user: "u",
                pass: "p",
            });

            assert.ok(spawnProcessStub.calledOnce);
            assert.deepStrictEqual(spawnProcessStub.firstCall.args[1], [
                "arg1",
                "--non-interactive",
                "--username",
                "u",
                "--password-from-stdin",
            ]);
            assert.strictEqual(spawnProcessStub.firstCall.args[2].input, "p");
        });

        test("should insert auth arguments before '--' if it exists", async () => {
            spawnProcessStub.resolves({ stdout: "success output", stderr: "" });

            await (svn as unknown as TestedSVN).execSvn(["arg1", "--", "file.txt"], "/mock/cwd", {
                user: "u",
                pass: "p",
            });

            assert.ok(spawnProcessStub.calledOnce);
            assert.deepStrictEqual(spawnProcessStub.firstCall.args[1], [
                "arg1",
                "--non-interactive",
                "--username",
                "u",
                "--password-from-stdin",
                "--",
                "file.txt",
            ]);
            assert.strictEqual(spawnProcessStub.firstCall.args[2].input, "p");
        });
    });

    suite("getRepositoryRoot", () => {
        let execSvnStub: sinon.SinonStub;

        setup(() => {
            execSvnStub = sandbox.stub(svn as unknown as TestedSVN, "execSvn");
        });

        test("should return repository root from xml", async () => {
            execSvnStub.resolves({
                stdout: `<info>
    <entry>
        <repository>
            <root>https://svn.example.com/repo</root>
        </repository>
    </entry>
</info>`,
                stderr: "",
            });

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
            execSvnStub = sandbox.stub(svn as unknown as TestedSVN, "execSvn");
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
            execSvnStub.resolves({ stdout: xml, stderr: "" });

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
                (err: unknown) => err instanceof SvnCommandError && err.message === "Generic error",
            );

            assert.ok(loggerMock.error.calledWith("Failed to blame file"));
        });

        test("should not use --force by default", async () => {
            execSvnStub.resolves({
                stdout: `<?xml version="1.0" encoding="UTF-8"?>
<blame>
<target path="file.txt">
</target>
</blame>`,
                stderr: "",
            });

            await svn.blameFile("/mock/path/file.txt");

            assert.ok(execSvnStub.calledOnce);

            const args = execSvnStub.firstCall.args[0];

            assert.deepStrictEqual(args, [
                "blame",
                "--xml",
                "-x",
                "-w --ignore-eol-style",
                "--",
                "file.txt",
            ]);
        });

        test("should use --force when force blame is requested", async () => {
            execSvnStub.resolves({
                stdout: `<?xml version="1.0" encoding="UTF-8"?>
<blame>
<target path="file.txt">
</target>
</blame>`,
                stderr: "",
            });

            await svn.blameFile("/mock/path/file.txt", true);

            assert.ok(execSvnStub.calledOnce);

            const args = execSvnStub.firstCall.args[0];

            assert.deepStrictEqual(args, [
                "blame",
                "--xml",
                "-x",
                "-w --ignore-eol-style",
                "--force",
                "--",
                "file.txt",
            ]);
        });

        test("should throw BinaryFileError when SVN skips a binary file", async () => {
            execSvnStub.resolves({
                stdout: '<blame><target path="file.txt"></target></blame>',
                stderr: "Skipping binary file 'file.txt'\n",
            });

            await assert.rejects(
                svn.blameFile("/mock/path/file.txt"),
                (err: unknown) => err instanceof BinaryFileError,
            );
        });

        test("should not throw BinaryFileError when force blame is enabled", async () => {
            execSvnStub.resolves({
                stdout: '<blame><target path="file.txt"></target></blame>',
                stderr: "Skipping binary file 'file.txt'\n",
            });

            await assert.doesNotReject(svn.blameFile("/mock/path/file.txt", true));
        });

        for (const useStoredCredentials of [true, false]) {
            test(`preserves binary warnings after retry with ${useStoredCredentials ? "stored" : "new"} credentials`, async () => {
                const credentials = { user: "u", pass: "p" };
                execSvnStub.onFirstCall().rejects(new Error("Authentication failed"));
                execSvnStub.onSecondCall().resolves({
                    stdout: "<info><entry><repository><root>https://svn.example.com/repo</root></repository></entry></info>",
                    stderr: "",
                });
                execSvnStub.onThirdCall().resolves({
                    stdout: "<blame></blame>",
                    stderr: "Skipping binary file 'file.txt'\n",
                });
                credentialManagerMock.getCredentials.resolves(
                    useStoredCredentials ? credentials : undefined,
                );
                credentialManagerMock.promptForCredentials.resolves(credentials);

                await assert.rejects(svn.blameFile("/mock/path/file.txt"), BinaryFileError);
                assert.ok(
                    execSvnStub.thirdCall.calledWithExactly(
                        ["blame", "--xml", "-x", "-w --ignore-eol-style", "--", "file.txt"],
                        "/mock/path",
                        credentials,
                    ),
                );
            });
        }

        test("does not treat unrelated successful stderr as a binary error", async () => {
            execSvnStub.resolves({ stdout: "<blame></blame>", stderr: "Unrelated warning" });
            assert.deepStrictEqual(await svn.blameFile("/mock/path/file.txt"), []);
        });
    });

    suite("getLogForRevision", () => {
        let execSvnStub: sinon.SinonStub;

        setup(() => {
            execSvnStub = sandbox.stub(svn as unknown as TestedSVN, "execSvn");
        });

        test("should return formatted log string", async () => {
            const xml = `<?xml version="1.0" encoding="UTF-8"?>
<log>
<logentry revision="123">
<msg>Fix typo</msg>
</logentry>
</log>`;
            execSvnStub.resolves({ stdout: xml, stderr: "" });

            const result = await svn.getLogForRevision("/mock/path/file.txt", "123");
            assert.strictEqual(result, "Fix typo");
        });

        test("should throw error if execSvn fails", async () => {
            execSvnStub.rejects(new Error("Log error"));

            await assert.rejects(
                async () => {
                    await svn.getLogForRevision("/mock/path/file.txt", "123");
                },
                (err: unknown) => err instanceof SvnCommandError && err.message === "Log error",
            );

            assert.ok(loggerMock.error.calledWith("Failed to get revision log"));
        });
    });

    suite("Error Handling", () => {
        let execSvnStub: sinon.SinonStub;

        setup(() => {
            execSvnStub = sandbox.stub(svn as unknown as TestedSVN, "execSvn");
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
                execSvnStub.onSecondCall().resolves({
                    stdout: `<info><entry><repository><root>${repoRoot}</root></repository></entry></info>`,
                    stderr: "",
                });

                // 3rd call to execSvn (retry with stored credentials) succeeds
                execSvnStub.onThirdCall().resolves({ stdout: "blame output success", stderr: "" });

                credentialManagerMock.getCredentials.resolves({ user: "u", pass: "p" });

                // Try blame file
                const promise = (svn as unknown as TestedSVN).command(["blame", "file.txt"], {
                    cwd: "/cwd",
                    fileName: "/cwd/file.txt",
                });

                const result = await promise;
                assert.deepStrictEqual(result, { stdout: "blame output success", stderr: "" });

                assert.ok(credentialManagerMock.getCredentials.calledWith(repoRoot));
                assert.ok(execSvnStub.calledThrice);
            });

            test("should prompt for credentials if no stored credentials and save on success", async () => {
                const repoRoot = "https://svn.example.com/repo";

                execSvnStub.onCall(0).rejects(new Error("Authentication failed"));
                execSvnStub.onCall(1).resolves({
                    stdout: `<info><entry><repository><root>${repoRoot}</root></repository></entry></info>`,
                    stderr: "",
                });
                execSvnStub.onCall(2).resolves({ stdout: "blame output success", stderr: "" });

                credentialManagerMock.getCredentials.resolves(undefined);
                credentialManagerMock.promptForCredentials.resolves({ user: "newU", pass: "newP" });

                const promise = (svn as unknown as TestedSVN).command(["blame", "file.txt"], {
                    cwd: "/cwd",
                    fileName: "/cwd/file.txt",
                });
                const result = await promise;

                assert.deepStrictEqual(result, { stdout: "blame output success", stderr: "" });
                assert.ok(credentialManagerMock.promptForCredentials.calledWith(repoRoot));
                assert.ok(
                    credentialManagerMock.storeCredentials.calledWith(repoRoot, "newU", "newP"),
                );
            });

            test("should throw AuthenticationError if prompts return undefined", async () => {
                const repoRoot = "https://svn.example.com/repo";

                execSvnStub.onCall(0).rejects(new Error("Authentication failed"));
                execSvnStub.onCall(1).resolves({
                    stdout: `<info><entry><repository><root>${repoRoot}</root></repository></entry></info>`,
                    stderr: "",
                });

                credentialManagerMock.getCredentials.resolves(undefined);
                credentialManagerMock.promptForCredentials.resolves(undefined);

                await assert.rejects(
                    async () => {
                        await (svn as unknown as TestedSVN).command(["blame", "file.txt"], {
                            cwd: "/cwd",
                            fileName: "/cwd/file.txt",
                        });
                    },
                    (err: unknown) =>
                        err instanceof AuthenticationError && err.fileName === "/cwd/file.txt",
                );
            });

            test("should throw AuthenticationError if getRepositoryRoot returns undefined", async () => {
                execSvnStub.onCall(0).rejects(new Error("Authentication failed"));
                execSvnStub.onCall(1).resolves({ stdout: "invalid xml", stderr: "" }); // getRepositoryRoot fails to parse

                await assert.rejects(
                    async () => {
                        await (svn as unknown as TestedSVN).command(["blame", "file.txt"], {
                            cwd: "/cwd",
                            fileName: "/cwd/file.txt",
                        });
                    },
                    (err: unknown) =>
                        err instanceof AuthenticationError && err.fileName === "/cwd/file.txt",
                );
            });

            test("should handle nested failures during auth retry", async () => {
                const repoRoot = "https://svn.example.com/repo";

                execSvnStub.onCall(0).rejects(new Error("Authentication failed"));
                execSvnStub.onCall(1).resolves({
                    stdout: `<info><entry><repository><root>${repoRoot}</root></repository></entry></info>`,
                    stderr: "",
                });

                // Retry also fails
                execSvnStub.onCall(2).rejects(new Error("Auth failed again"));

                credentialManagerMock.getCredentials.resolves({ user: "u", pass: "p" });

                await assert.rejects(
                    async () => {
                        await (svn as unknown as TestedSVN).command(["blame", "file.txt"], {
                            cwd: "/cwd",
                            fileName: "/cwd/file.txt",
                        });
                    },
                    (err: unknown) =>
                        err instanceof AuthenticationError && err.fileName === "/cwd/file.txt",
                );
            });
        });
    });
});
