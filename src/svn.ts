import { basename, dirname } from "path";
import { LogOutputChannel, workspace } from "vscode";

import { EXTENSION_CONFIGURATION } from "./const/extension";
import { ConfigurationError } from "./errors/configuration-error";
import { NotWorkingCopyError } from "./errors/not-working-copy-error";
import { mapBlameOutputToBlameModel } from "./mapping/map-blame-output-to-blame-model";
import { mapLogOutputToMessage } from "./mapping/map-log-output-to-message";
import { Blame } from "./types/blame.model";
import { spawnProcess } from "./util/spawn-process";

export class SVN {
    /**
     * Cache for in-flight requests to deduplicate concurrent calls.
     * This is not a persistent cache; entries are removed once the promise settles.
     */
    private requestCache = new Map<string, Promise<string | undefined>>();

    constructor(private logger: LogOutputChannel) {}

    private async command(
        command: string,
        { cwd, fileName }: { cwd: string; fileName: string },
    ): Promise<string> {
        try {
            const { svnExecutablePath } = workspace.getConfiguration(EXTENSION_CONFIGURATION);

            if (!svnExecutablePath) {
                throw new ConfigurationError(
                    `${EXTENSION_CONFIGURATION}.svnExecutablePath`,
                    svnExecutablePath,
                );
            }

            return await spawnProcess(`${svnExecutablePath} ${command}`, { cwd });
        } catch (err: any) {
            if (typeof err === "string") {
                if (err.includes("E155007")) {
                    this.logger.warn("File is not a working copy, cannot complete action");
                    throw new NotWorkingCopyError(fileName);
                }

                throw new Error(err);
            }

            throw err;
        }
    }

    async blameFile(fileName: string): Promise<Blame[]> {
        this.logger.debug("Running blame child process");
        try {
            const dir = dirname(fileName);
            const file = basename(fileName);

            const data = await this.command(`blame --xml -x "-w --ignore-eol-style" "${file}"`, {
                cwd: dir,
                fileName,
            });

            this.logger.debug("Blame child process successful");

            return mapBlameOutputToBlameModel(data);
        } catch (err: any) {
            this.logger.error("Failed to blame file", { err: err?.toString() });
            throw err;
        }
    }

    async getLogForRevision(fileName: string, revision: string) {
        const key = `${fileName}::${revision}`;
        if (this.requestCache.has(key)) {
            return this.requestCache.get(key);
        }

        const promise = (async () => {
            try {
                const dir = dirname(fileName);
                const file = basename(fileName);

                const data = await this.command(`log --xml -r ${revision} "${file}"`, {
                    cwd: dir,
                    fileName,
                });
                return mapLogOutputToMessage(data);
            } catch (err: any) {
                this.logger.error("Failed to get revision log", { err: err?.toString() });
                throw err;
            }
        })();

        this.requestCache.set(key, promise);

        try {
            return await promise;
        } finally {
            this.requestCache.delete(key);
        }
    }
}
