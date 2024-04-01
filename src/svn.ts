import { LogOutputChannel, workspace } from "vscode";

import { EXTENSION_CONFIGURATION } from "./const/extension";
import { ConfigurationError } from "./errors/configuration-error";
import { NotWorkingCopyError } from "./errors/not-working-copy-error";
import { mapBlameOutputToBlameModel } from "./mapping/map-blame-output-to-blame-model";
import { mapLogOutputToMessage } from "./mapping/map-log-output-to-message";
import { Blame } from "./types/blame.model";
import { spawnProcess } from "./util/spawn-process";

export class SVN {
    constructor(private logger: LogOutputChannel) {}

    private async command(command: string) {
        const { svnExecutablePath } = workspace.getConfiguration(EXTENSION_CONFIGURATION);

        if (!svnExecutablePath) {
            throw new ConfigurationError(
                `${EXTENSION_CONFIGURATION}.svnExecutablePath`,
                svnExecutablePath,
            );
        }

        return await spawnProcess(`${svnExecutablePath} ${command}`);
    }

    async blameFile(fileName: string): Promise<Blame[]> {
        this.logger.debug("Running blame child process");
        try {
            const data = await this.command(`blame --xml -x "-w --ignore-eol-style" "${fileName}"`);

            this.logger.debug("Blame child process successful");

            return mapBlameOutputToBlameModel(data);
        } catch (err: any) {
            if (typeof err === "string" && err.includes("E155007")) {
                this.logger.warn("File is not a working copy, cannot complete action");
                throw new NotWorkingCopyError(fileName);
            }

            this.logger.error("Failed to blame file", { err });
            throw new Error(err);
        }
    }

    async getLogForRevision(fileName: string, revision: string) {
        const data = await this.command(`log --xml -r ${revision} "${fileName}"`);

        return mapLogOutputToMessage(data);
    }

    async getLogsForRevisions(fileName: string, revisions: string[]): Promise<Log[]> {
        this.logger.debug("Running log child process");

        try {
            const logs = await Promise.all(
                revisions.map(async (revision) => {
                    const log = await this.getLogForRevision(fileName, revision);
                    return { log, revision };
                }),
            );

            this.logger.debug("Log child process successful");

            return mapLogOutputToMessage(data);
        } catch (err: any) {
            if (typeof err === "string" && err.includes("E155007")) {
                this.logger.warn("File is not a working copy, cannot complete action");
                throw new NotWorkingCopyError(fileName);
            }

            this.logger.error("Failed to get revision log", { err });
            throw new Error(err);
        }
    }
}
