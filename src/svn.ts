import { basename, dirname } from "path";
import { LogOutputChannel, workspace } from "vscode";

import { EXTENSION_CONFIGURATION } from "./const/extension";
import { CredentialManager } from "./credential-manager";
import { AuthenticationError } from "./errors/authentication-error";
import { ConfigurationError } from "./errors/configuration-error";
import { NotWorkingCopyError } from "./errors/not-working-copy-error";
import { mapBlameOutputToBlameModel } from "./mapping/map-blame-output-to-blame-model";
import { mapInfoOutputToRepoRoot } from "./mapping/map-info-output-to-repo-root";
import { mapLogOutputToMessage } from "./mapping/map-log-output-to-message";
import { Blame } from "./types/blame.model";
import { ICredentials } from "./types/credentials.model";
import { spawnProcess } from "./util/spawn-process";

export class SVN {
    constructor(
        private logger: LogOutputChannel,
        private credentialManager: CredentialManager,
    ) {}

    private async execSvn(
        args: string[],
        cwd: string,
        credentials?: ICredentials,
    ): Promise<string> {
        const { svnExecutablePath } = workspace.getConfiguration(EXTENSION_CONFIGURATION);

        if (!svnExecutablePath) {
            throw new ConfigurationError(
                `${EXTENSION_CONFIGURATION}.svnExecutablePath`,
                svnExecutablePath,
            );
        }

        const allArgs = [...args];

        if (credentials) {
            const authArgs = [
                "--non-interactive",
                "--username",
                credentials.user,
                "--password",
                credentials.pass,
            ];

            const dashDashIndex = allArgs.indexOf("--");
            if (dashDashIndex >= 0) {
                allArgs.splice(dashDashIndex, 0, ...authArgs);
            } else {
                allArgs.push(...authArgs);
            }
        }

        return await spawnProcess(svnExecutablePath, allArgs, { cwd });
    }

    private async handleAuthFailure(
        args: string[],
        params: { cwd: string; fileName: string },
    ): Promise<string> {
        this.logger.warn("Authentication failed");

        try {
            const repoRoot = await this.getRepositoryRoot(params.fileName);
            if (!repoRoot) {
                throw new AuthenticationError(params.fileName);
            }

            // 1. Try with stored credentials first
            const stored = await this.credentialManager.getCredentials(repoRoot);
            if (stored) {
                this.logger.info("Retrying with stored credentials");
                return await this.execSvn(args, params.cwd, stored);
            }

            // 2. Prompt user if no stored credentials found
            this.logger.info("No stored credentials, prompting user");
            const newCreds = await this.credentialManager.promptForCredentials(repoRoot);

            if (newCreds) {
                // Try to execute with new credentials
                const result = await this.execSvn(args, params.cwd, newCreds);

                // If successful, store them
                this.logger.info("Credentials verified and stored successfully");
                await this.credentialManager.storeCredentials(
                    repoRoot,
                    newCreds.user,
                    newCreds.pass,
                );

                return result;
            }
        } catch (retryErr: unknown) {
            this.logger.warn("Retry with credentials failed");
        }

        throw new AuthenticationError(params.fileName);
    }

    private async command(
        args: string[],
        params: { cwd: string; fileName: string },
    ): Promise<string> {
        try {
            return await this.execSvn(args, params.cwd);
        } catch (err: unknown) {
            let errorString = "";

            if (typeof err === "string") {
                errorString = err;
            } else if (err instanceof Error) {
                errorString = err.message;
            } else if (typeof err === "object" && err !== null && "message" in err) {
                if (typeof err.message === "string") {
                    errorString = err.message;
                }
            }

            if (errorString) {
                if (errorString.includes("E155007")) {
                    this.logger.warn("File is not a working copy, cannot complete action");
                    throw new NotWorkingCopyError(params.fileName);
                }

                const isAuthError =
                    errorString.includes("No more credentials") ||
                    errorString.includes("Authentication failed") ||
                    errorString.includes("E170001") ||
                    errorString.includes("E215004");

                if (isAuthError) {
                    return await this.handleAuthFailure(args, params);
                }

                throw new Error(errorString);
            }

            throw err;
        }
    }

    async getRepositoryRoot(fileName: string): Promise<string | undefined> {
        try {
            const dir = dirname(fileName);
            // "svn info --xml" gives us the repo info. We want <repository><root>
            // We use the file name to target the specific file's repo
            const data = await this.execSvn(["info", "--xml", "--", basename(fileName)], dir);

            return mapInfoOutputToRepoRoot(data);
        } catch (err: unknown) {
            this.logger.warn("Failed to get repository root", { err: String(err) });
            return undefined;
        }
    }

    async blameFile(fileName: string): Promise<Blame[]> {
        this.logger.debug("Running blame child process");
        try {
            const dir = dirname(fileName);
            const file = basename(fileName);

            const data = await this.command(
                ["blame", "--xml", "-x", "-w --ignore-eol-style", "--", file],
                {
                    cwd: dir,
                    fileName,
                },
            );

            this.logger.debug("Blame child process successful");

            return mapBlameOutputToBlameModel(data);
        } catch (err: unknown) {
            this.logger.error("Failed to blame file", { err: String(err), fileName });
            throw err;
        }
    }

    async getLogForRevision(fileName: string, revision: string) {
        try {
            const dir = dirname(fileName);
            const file = basename(fileName);

            const data = await this.command(["log", "--xml", "-r", revision, "--", file], {
                cwd: dir,
                fileName,
            });
            return mapLogOutputToMessage(data);
        } catch (err: unknown) {
            this.logger.error("Failed to get revision log", { err: String(err) });
            throw err;
        }
    }
}
