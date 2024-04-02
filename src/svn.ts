import { LogOutputChannel } from "vscode";

import { NotWorkingCopyError } from "./errors/not-working-copy-error";
import { mapBlameOutputToBlameModel } from "./mapping/map-blame-output-to-blame-model";
import { mapLogOutputToMessage } from "./mapping/map-log-output-to-message";
import { Blame } from "./types/blame.model";
import { spawnProcess } from "./util/spawn-process";

export class SVN {
    constructor(private logger: LogOutputChannel) {}

    async blameFile(fileName: string): Promise<Blame[]> {
        this.logger.debug("Running blame child process");
        try {
            const data = await spawnProcess(
                `svn blame --xml -x "-w --ignore-eol-style" "${fileName}"`,
            );

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
        try {
            const data = await spawnProcess(`svn log --xml -r ${revision} "${fileName}"`);

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
