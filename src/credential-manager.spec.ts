import * as assert from "assert";
import sinon from "sinon";
import { ExtensionContext, LogOutputChannel, window } from "vscode";

import { CredentialManager } from "./credential-manager";
import { DummyLogOutputChannel } from "./test/mock-vscode";

suite("CredentialManager Test Suite", () => {
    let contextMock: ExtensionContext;
    let loggerMock: sinon.SinonStubbedInstance<LogOutputChannel>;
    let credentialManager: CredentialManager;
    let sandbox: sinon.SinonSandbox;

    let secretsMap: Map<string, string>;
    let globalStateMap: Map<string, any>;

    setup(() => {
        sandbox = sinon.createSandbox();
        secretsMap = new Map<string, string>();
        globalStateMap = new Map<string, any>();

        contextMock = {
            secrets: {
                get: sandbox.stub().callsFake(async (key: string) => secretsMap.get(key)),
                store: sandbox
                    .stub()
                    .callsFake(async (key: string, value: string) => secretsMap.set(key, value)),
                delete: sandbox.stub().callsFake(async (key: string) => secretsMap.delete(key)),
                onDidChange: sandbox.stub(),
            },
            globalState: {
                get: sandbox
                    .stub()
                    .callsFake((key: string, defaultValue?: any) =>
                        globalStateMap.has(key) ? globalStateMap.get(key) : defaultValue,
                    ),
                update: sandbox
                    .stub()
                    .callsFake(async (key: string, value: any) => globalStateMap.set(key, value)),
                keys: sandbox.stub().returns([]),
                setKeysForSync: sandbox.stub(),
            },
            // Other properties can be mocked as necessary, but these are all that are needed for `CredentialManager` right now.
        } as unknown as ExtensionContext;

        loggerMock = sandbox.createStubInstance(
            DummyLogOutputChannel,
        ) as unknown as sinon.SinonStubbedInstance<LogOutputChannel>;

        credentialManager = new CredentialManager(contextMock, loggerMock as any);
    });

    teardown(() => {
        sandbox.restore();
    });

    test("should retrieve stored credentials", async () => {
        const repoUrl = "https://svn.example.com/repo";
        const creds = { user: "testuser", pass: "testpass" };
        secretsMap.set(`svn.auth${repoUrl}`, JSON.stringify(creds));

        const result = await credentialManager.getCredentials(repoUrl);
        assert.deepStrictEqual(result, creds);
    });

    test("should add repository to known list when credentials already exist", async () => {
        const repoUrl = "https://svn.example.com/repo";
        const creds = { user: "testuser", pass: "testpass" };
        secretsMap.set(`svn.auth${repoUrl}`, JSON.stringify(creds));
        globalStateMap.set("svn.auth.known-repos", []);

        const result = await credentialManager.getCredentials(repoUrl);

        assert.deepStrictEqual(result, creds);
        const knownRepos = globalStateMap.get("svn.auth.known-repos");
        assert.deepStrictEqual(knownRepos, [repoUrl]);
    });

    test("should handle missing credentials", async () => {
        const repoUrl = "https://svn.example.com/repo";
        const result = await credentialManager.getCredentials(repoUrl);
        assert.strictEqual(result, undefined);
    });

    test("should delete corrupt credentials when parsing fails", async () => {
        const repoUrl = "https://svn.example.com/repo";
        secretsMap.set(`svn.auth${repoUrl}`, "invalid-json");

        const result = await credentialManager.getCredentials(repoUrl);

        assert.strictEqual(result, undefined);
        assert.strictEqual(secretsMap.has(`svn.auth${repoUrl}`), false);
        // Ensure error was logged
        assert.ok((loggerMock.error as sinon.SinonStub).calledOnce);
    });

    test("should store credentials and add to known repositories", async () => {
        const repoUrl = "https://svn.example.com/repo";

        await credentialManager.storeCredentials(repoUrl, "testuser", "testpass");

        const storedSecret = secretsMap.get(`svn.auth${repoUrl}`);
        assert.strictEqual(storedSecret, JSON.stringify({ user: "testuser", pass: "testpass" }));

        const knownRepos = globalStateMap.get("svn.auth.known-repos");
        assert.deepStrictEqual(knownRepos, [repoUrl]);
    });

    test("should delete credentials and remove from known repositories", async () => {
        const repoUrl = "https://svn.example.com/repo";
        secretsMap.set(
            `svn.auth${repoUrl}`,
            JSON.stringify({ user: "testuser", pass: "testpass" }),
        );
        globalStateMap.set("svn.auth.known-repos", [repoUrl, "https://svn.example.com/repo2"]);

        await credentialManager.deleteCredentials(repoUrl);

        assert.strictEqual(secretsMap.has(`svn.auth${repoUrl}`), false);
        const knownRepos = globalStateMap.get("svn.auth.known-repos");
        assert.deepStrictEqual(knownRepos, ["https://svn.example.com/repo2"]);
    });

    test("should list known repositories", async () => {
        const repos = ["https://svn.example.com/repo1", "https://svn.example.com/repo2"];
        globalStateMap.set("svn.auth.known-repos", repos);

        const result = await credentialManager.listKnownRepositories();
        assert.deepStrictEqual(result, repos);
    });

    test("should prompt for credentials successfully", async () => {
        const showInputBoxStub = sandbox.stub(window, "showInputBox");
        // First call for username, second for password
        showInputBoxStub.onFirstCall().resolves("testuser");
        showInputBoxStub.onSecondCall().resolves("testpass");

        const result = await credentialManager.promptForCredentials("https://svn.example.com/repo");

        assert.deepStrictEqual(result, { user: "testuser", pass: "testpass" });
        assert.ok(showInputBoxStub.calledTwice);
    });

    test("should handle cancellation when prompting for username", async () => {
        const showInputBoxStub = sandbox.stub(window, "showInputBox");
        // User cancels username input
        showInputBoxStub.onFirstCall().resolves(undefined);

        const result = await credentialManager.promptForCredentials("https://svn.example.com/repo");

        assert.strictEqual(result, undefined);
        assert.ok(showInputBoxStub.calledOnce); // Should not prompt for password
    });

    test("should handle cancellation when prompting for password", async () => {
        const showInputBoxStub = sandbox.stub(window, "showInputBox");
        // User enters username, but cancels password input
        showInputBoxStub.onFirstCall().resolves("testuser");
        showInputBoxStub.onSecondCall().resolves(undefined);

        const result = await credentialManager.promptForCredentials("https://svn.example.com/repo");

        assert.strictEqual(result, undefined);
        assert.ok(showInputBoxStub.calledTwice);
    });

    test("should manage credentials - remove specific repository", async () => {
        const repoUrl = "https://svn.example.com/repo";
        globalStateMap.set("svn.auth.known-repos", [repoUrl]);
        secretsMap.set(
            `svn.auth${repoUrl}`,
            JSON.stringify({ user: "testuser", pass: "testpass" }),
        );

        // Mock showQuickPick to select the specific repository
        const showQuickPickStub = sandbox.stub(window, "showQuickPick");
        showQuickPickStub.resolves({ label: repoUrl } as any);

        const showInformationMessageStub = sandbox.stub(window, "showInformationMessage");

        await credentialManager.manageCredentials();

        // Verify credentials were deleted
        assert.strictEqual(secretsMap.has(`svn.auth${repoUrl}`), false);
        const knownRepos = globalStateMap.get("svn.auth.known-repos");
        assert.deepStrictEqual(knownRepos, []);

        // Verify info message was shown
        assert.ok(showInformationMessageStub.calledWith(`Removed credentials for ${repoUrl}`));
    });

    test("should manage credentials - remove all repositories", async () => {
        const repo1 = "https://svn.example.com/repo1";
        const repo2 = "https://svn.example.com/repo2";
        globalStateMap.set("svn.auth.known-repos", [repo1, repo2]);
        secretsMap.set(`svn.auth${repo1}`, JSON.stringify({ user: "user1", pass: "pass1" }));
        secretsMap.set(`svn.auth${repo2}`, JSON.stringify({ user: "user2", pass: "pass2" }));

        // Mock showQuickPick to select 'Remove All'
        const showQuickPickStub = sandbox.stub(window, "showQuickPick");
        showQuickPickStub.callsFake(async (items: any) => {
            // Find the remove all option
            return items.find((item: any) => item.label.includes("Remove All"));
        });

        const showWarningMessageStub = sandbox
            .stub(window, "showWarningMessage")
            .resolves("Yes" as any);
        const showInformationMessageStub = sandbox.stub(window, "showInformationMessage");

        await credentialManager.manageCredentials();

        // Verify all credentials were deleted
        assert.strictEqual(secretsMap.has(`svn.auth${repo1}`), false);
        assert.strictEqual(secretsMap.has(`svn.auth${repo2}`), false);

        const knownRepos = globalStateMap.get("svn.auth.known-repos");
        assert.deepStrictEqual(knownRepos, []);

        assert.ok(showWarningMessageStub.calledOnce);
        assert.ok(showInformationMessageStub.calledWith("All SVN credentials removed."));
    });

    test("should handle no stored credentials during manageCredentials", async () => {
        globalStateMap.set("svn.auth.known-repos", []);
        const showInformationMessageStub = sandbox.stub(window, "showInformationMessage");

        await credentialManager.manageCredentials();

        assert.ok(showInformationMessageStub.calledWith("No stored SVN credentials found."));
    });
});
