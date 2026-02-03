import { ExtensionContext, LogOutputChannel, window } from "vscode";

import { ICredentials } from "./types/credentials.model";

export class CredentialManager {
    private static readonly SECRET_PREFIX = "svn.auth";
    private static readonly KNOWN_REPOS_KEY = "svn.auth.known-repos";

    constructor(
        private context: ExtensionContext,
        private logger: LogOutputChannel,
    ) {}

    private getKey(repoUrl: string): string {
        return `${CredentialManager.SECRET_PREFIX}${repoUrl}`;
    }

    private getKnownRepositories(): string[] {
        return this.context.globalState.get<string[]>(CredentialManager.KNOWN_REPOS_KEY, []);
    }

    private async addKnownRepository(repoUrl: string): Promise<void> {
        const repos = this.getKnownRepositories();
        if (!repos.includes(repoUrl)) {
            await this.context.globalState.update(CredentialManager.KNOWN_REPOS_KEY, [
                ...repos,
                repoUrl,
            ]);
        }
    }

    private async removeKnownRepository(repoUrl: string): Promise<void> {
        const repos = this.getKnownRepositories();
        const newRepos = repos.filter((r) => r !== repoUrl);
        await this.context.globalState.update(CredentialManager.KNOWN_REPOS_KEY, newRepos);
    }

    async getCredentials(repoUrl: string): Promise<ICredentials | undefined> {
        this.logger.debug("Retrieving credentials", { repoUrl });
        const key = this.getKey(repoUrl);
        const stored = await this.context.secrets.get(key);

        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (err) {
                this.logger.error("Failed to parse stored credentials", { err, repoUrl });
                await this.deleteCredentials(repoUrl);
            }
        }
        return undefined;
    }

    async storeCredentials(repoUrl: string, user: string, pass: string): Promise<void> {
        this.logger.info("Storing credentials", { repoUrl, user });
        const key = this.getKey(repoUrl);
        await this.context.secrets.store(key, JSON.stringify({ user, pass }));
        await this.addKnownRepository(repoUrl);
    }

    async deleteCredentials(repoUrl: string): Promise<void> {
        this.logger.info("Deleting credentials", { repoUrl });
        await this.context.secrets.delete(this.getKey(repoUrl));
        await this.removeKnownRepository(repoUrl);
    }

    async listKnownRepositories(): Promise<string[]> {
        return this.getKnownRepositories();
    }

    async promptForCredentials(repoUrl: string): Promise<ICredentials | undefined> {
        const user = await window.showInputBox({
            prompt: `Enter SVN Username for ${repoUrl}`,
            placeHolder: "Username",
            ignoreFocusOut: true,
            validateInput: (value) => (value.trim() ? null : "Username is required"),
        });

        if (!user) {
            return undefined;
        }

        const pass = await window.showInputBox({
            prompt: `Enter SVN Password for ${repoUrl}`,
            placeHolder: "Password",
            password: true,
            ignoreFocusOut: true,
            validateInput: (value) => (value.trim() ? null : "Password is required"),
        });

        if (pass === undefined) {
            return undefined;
        }

        return { user: user.trim(), pass };
    }
    async manageCredentials() {
        const repos = this.getKnownRepositories();

        if (!repos.length) {
            window.showInformationMessage("No stored SVN credentials found.");
            return;
        }

        const items = repos.map((label) => ({ label }));
        const removeAll = {
            label: "$(trash) Remove All Credentials",
            description: "Clear all stored SVN credentials",
        };

        const selection = await window.showQuickPick([removeAll, ...items], {
            placeHolder: "Select a repository to remove credentials for",
        });

        if (!selection) {
            this.logger.debug("Credential management cancelled by user");
            return;
        }

        if (selection === removeAll) {
            this.logger.debug("User selected remove all credentials");
            const confirm = await window.showWarningMessage(
                "Are you sure you want to remove all stored SVN credentials?",
                "Yes",
                "No",
            );
            if (confirm === "Yes") {
                this.logger.info("Removing all stored credentials");
                try {
                    const results = await Promise.allSettled(
                        repos.map((repo) => this.context.secrets.delete(this.getKey(repo))),
                    );

                    const failedRepos = repos.filter(
                        (_repo, i) => results[i].status === "rejected",
                    );

                    if (failedRepos.length > 0) {
                        this.logger.error("Failed to remove some credentials", { failedRepos });
                        await this.context.globalState.update(
                            CredentialManager.KNOWN_REPOS_KEY,
                            failedRepos,
                        );
                        window.showErrorMessage(
                            "Failed to remove one or more credentials. Please try again.",
                        );
                    } else {
                        this.logger.info("All stored credentials removed successfully");
                        await this.context.globalState.update(
                            CredentialManager.KNOWN_REPOS_KEY,
                            [],
                        );
                        window.showInformationMessage("All SVN credentials removed.");
                    }
                } catch (err) {
                    this.logger.error(
                        "An unexpected error occurred while removing all credentials",
                        { err },
                    );
                    window.showErrorMessage("An unexpected error occurred. Please try again.");
                }
            }
            return;
        }

        this.logger.info("User selected repository for credential removal", {
            repoUrl: selection.label,
        });
        await this.deleteCredentials(selection.label);
        window.showInformationMessage(`Removed credentials for ${selection.label}`);
    }
}
