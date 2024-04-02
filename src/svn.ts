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

    private async command(command: string, fileName: string) {
        try {
            const { svnExecutablePath } = workspace.getConfiguration(EXTENSION_CONFIGURATION);

            if (!svnExecutablePath) {
                throw new ConfigurationError(
                    `${EXTENSION_CONFIGURATION}.svnExecutablePath`,
                    svnExecutablePath,
                );
            }

            return await spawnProcess(`${svnExecutablePath} ${command}`);
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
            const data = await this.command(
                `blame --xml -x "-w --ignore-eol-style" "${fileName}"`,
                fileName,
            );

            this.logger.debug("Blame child process successful");

            return mapBlameOutputToBlameModel(data);
        } catch (err: any) {
            this.logger.error("Failed to blame file", { err });
            throw err;
        }
    }

    async getLogForRevision(fileName: string, revision: string) {
        try {
            const data = await this.command(`log --xml -r ${revision} "${fileName}"`, fileName);
            return mapLogOutputToMessage(data);
        } catch (err: any) {
            this.logger.error("Failed to get revision log", { err });
            throw err;
        }
    }
}
