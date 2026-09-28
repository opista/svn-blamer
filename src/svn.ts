import { basename, dirname } from "path";
import { LogOutputChannel, workspace } from "vscode";

import { EXTENSION_CONFIGURATION } from "./const/extension";
import { CredentialManager } from "./credential-manager";
import { AuthenticationError } from "./errors/authentication-error";
import { BinaryFileError } from "./errors/binary-file-error";
import { ConfigurationError } from "./errors/configuration-error";
import { NotWorkingCopyError } from "./errors/not-working-copy-error";
import { SvnCommandError } from "./errors/svn-command-error";
import { mapBlameOutputToBlameModel } from "./mapping/map-blame-output-to-blame-model";
import { mapInfoOutputToRepoRoot } from "./mapping/map-info-output-to-repo-root";
import { mapLogOutputToMessage } from "./mapping/map-log-output-to-message";
import { Blame } from "./types/blame.model";
import { ICredentials } from "./types/credentials.model";
import { ISpawnProcessResult, spawnProcess } from "./util/spawn-process";

export class SVN {
    constructor(
        private logger: LogOutputChannel,
        private credentialManager: CredentialManager,
    ) {}

    private async execSvn(
        args: string[],
        cwd: string,
        credentials?: ICredentials,
    ): Promise<ISpawnProcessResult> {
        const { svnExecutablePath } = workspace.getConfiguration(EXTENSION_CONFIGURATION);

        if (!svnExecutablePath) {
            throw new ConfigurationError(
                `${EXTENSION_CONFIGURATION}.svnExecutablePath`,
                svnExecutablePath,
            );
        }

        const allArgs = [...args];

        let input: string | undefined;

        if (credentials) {
            const authArgs = [
                "--non-interactive",
                "--username",
                credentials.user,
                "--password-from-stdin",
            ];

            input = credentials.pass;

            const dashDashIndex = allArgs.indexOf("--");
            if (dashDashIndex >= 0) {
                allArgs.splice(dashDashIndex, 0, ...authArgs);
            } else {
                allArgs.push(...authArgs);
            }
        }

        try {
            return await spawnProcess(svnExecutablePath, allArgs, {
                cwd,
                input,
            });
        } catch (err: unknown) {
            const errorString = String(err);
            if (errorString.includes("password-from-stdin")) {
                throw new Error(
                    `Your SVN client version may be incompatible. This feature requires SVN v1.10 or newer for secure password handling. Please upgrade your SVN client. Original error: ${errorString}`,
                );
            }
            throw err;
        }
    }

    private async handleAuthFailure(
        args: string[],
        params: { cwd: string; fileName: string },
    ): Promise<ISpawnProcessResult> {
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
    ): Promise<ISpawnProcessResult> {
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

                throw new SvnCommandError(errorString);
            }

            throw err;
        }
    }

    async getRepositoryRoot(fileName: string): Promise<string | undefined> {
        try {
            const dir = dirname(fileName);
            // "svn info --xml" gives us the repo info. We want <repository><root>
            // We use the file name to target the specific file's repo
            const { stdout } = await this.execSvn(["info", "--xml", "--", basename(fileName)], dir);

            return mapInfoOutputToRepoRoot(stdout);
        } catch (err: unknown) {
            this.logger.warn("Failed to get repository root", { err: String(err) });
            return undefined;
        }
    }

    async blameFile(fileName: string, force = false): Promise<Blame[]> {
        this.logger.debug("Running blame child process");
        try {
            const dir = dirname(fileName);
            const file = basename(fileName);

            const args = ["blame", "--xml", "-x", "-w --ignore-eol-style"];
            if (force) {
                args.push("--force");
            }
            args.push("--", file);

            const { stdout, stderr } = await this.command(args, { cwd: dir, fileName });

            const blame = mapBlameOutputToBlameModel(stdout);

            // The SVN CLI clears SVN_ERR_CLIENT_IS_BINARY_FILE and writes a warning
            // to stderr, so it can exit successfully without returning blame entries.
            // Match the English warning because the CLI does not expose that error code.
            // Other locales may miss this prompt; the force command/setting still work.
            // Revisit localisation if users report missed prompts.
            if (
                !force &&
                blame.length === 0 &&
                (stderr.includes("Skipping binary file") ||
                    stderr.includes("use --force to treat as text"))
            ) {
                throw new BinaryFileError(fileName);
            }

            return blame;
        } catch (err: unknown) {
            this.logger.error("Failed to blame file", { err: String(err), fileName });
            throw err;
        }
    }

    async getLogForRevision(fileName: string, revision: string) {
        try {
            const dir = dirname(fileName);
            const file = basename(fileName);

            const { stdout } = await this.command(["log", "--xml", "-r", revision, "--", file], {
                cwd: dir,
                fileName,
            });
            return mapLogOutputToMessage(stdout);
        } catch (err: unknown) {
            this.logger.error("Failed to get revision log", { err: String(err) });
            throw err;
        }
    }
}
