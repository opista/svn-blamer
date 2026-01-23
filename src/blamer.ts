import merge from "lodash.merge";
import {
    LogOutputChannel,
    StatusBarAlignment,
    StatusBarItem,
    TextDocument,
    TextEditor,
    TextEditorDecorationType,
    TextEditorSelectionChangeEvent,
    window,
    workspace,
} from "vscode";

import { EXTENSION_CONFIGURATION, EXTENSION_NAME } from "./const/extension";
import { DecorationManager } from "./decoration-manager";
import { NotWorkingCopyError } from "./errors/not-working-copy-error";
import { mapToDecorationRecord } from "./mapping/map-to-decoration-record";
import { Storage } from "./storage";
import { SVN } from "./svn";
import { Blame } from "./types/blame.model";
import { DecorationRecord } from "./types/decoration-record.model";
import { disposeDecorations } from "./util/dispose-decorations";
import { getFileNameFromTextEditor } from "./util/get-file-name-from-text-editor";

export class Blamer {
    private activeLine: string | undefined;
    private activeLineDecoration: TextEditorDecorationType | undefined;
    private statusBarItem: StatusBarItem;

    constructor(
        private logger: LogOutputChannel,
        private storage: Storage<DecorationRecord>,
        private svn: SVN,
        private decorationManager: DecorationManager,
    ) {
        this.statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left, 0);
    }

    setStatusBarText(message: string, icon?: string) {
        const text = [icon ? `$(${icon})` : "", `${EXTENSION_NAME}:`, message];
        this.statusBarItem.text = text.filter(Boolean).join(" ");
    }

    clearRecordForFile(fileName: string) {
        return this.storage.delete(fileName);
    }

    clearRecordsForAllFiles() {
        return this.storage.clear();
    }

    getRecordForFile(fileName?: string) {
        if (!fileName) {
            return undefined;
        }
        return this.storage.get(fileName);
    }

    setRecordForFile(fileName: string, record: DecorationRecord) {
        return this.storage.set(fileName, record);
    }

    updateRecordForFile(fileName: string, update: Partial<DecorationRecord>) {
        const existingRecord = this.getRecordForFile(fileName);
        return this.storage.set(fileName, merge({}, existingRecord, update));
    }

    async getActiveTextEditorAndFileName() {
        const textEditor = window.activeTextEditor;
        const fileName = await getFileNameFromTextEditor(textEditor);

        return { fileName, textEditor };
    }

    handleClosedDocument(textDocument: TextDocument) {
        const { fileName } = textDocument;
        this.logger.debug("Document closed, clearing blame", { fileName });
        return this.clearRecordForFile(fileName);
    }

    async clearBlameForFile(fileName?: string) {
        if (!fileName) {
            this.logger.debug("No file found, aborting...");
            return;
        }

        const record = this.getRecordForFile(fileName);
        this.activeLineDecoration?.dispose();

        if (!record) {
            return;
        }

        this.logger.info("Clearing blame for file", { fileName });

        await disposeDecorations([...new Set(Object.values(record.revisionDecorations))]);

        this.clearRecordForFile(fileName);
    }

    async clearBlameForActiveTextEditor() {
        const { fileName } = await this.getActiveTextEditorAndFileName();
        return this.clearBlameForFile(fileName);
    }

    async getLogForRevision(fileName: string, revision: string) {
        const { enableLogs } = workspace.getConfiguration(EXTENSION_CONFIGURATION);

        if (!enableLogs) {
            this.logger.debug("Logging disabled, will run not log child process");
            return undefined;
        }

        this.logger.info("Fetching log for revision", {
            fileName,
            revision,
        });

        this.statusBarItem.show();
        this.setStatusBarText(`Fetching log for revision #${revision}`, "loading~spin");

        const result = await this.svn.getLogForRevision(fileName, revision);

        this.statusBarItem.hide();
        return result;
    }

    async showBlameForFile(textEditor?: TextEditor, fileName?: string) {
        if (!textEditor || !fileName) {
            this.logger.debug("No editor or file found, aborting...");
            return;
        }

        this.logger.info("Blaming file", { fileName });

        this.statusBarItem.show();
        this.setStatusBarText("Blaming file...", "loading~spin");

        await this.clearBlameForFile(fileName);

        const blame = await this.svn.blameFile(fileName);

        if (!blame.length) {
            return;
        }

        const uniqueRevisions = [...new Set(blame.map(({ revision }) => revision))];
        const icons = await this.decorationManager.createGutterImagePathHashMap(uniqueRevisions);

        const { blamesByLine, blamesByRevision, revisionDecorations } =
            await this.decorationManager.createAndSetDecorationsForBlame(textEditor, blame, icons);

        const record = mapToDecorationRecord({
            icons,
            blamesByLine,
            blamesByRevision,
            revisionDecorations,
        });

        this.statusBarItem.hide();
        this.setRecordForFile(fileName, record);

        this.logger.info("Blame successful", { fileName });
    }

    async showBlameForActiveTextEditor() {
        const { fileName, textEditor } = await this.getActiveTextEditorAndFileName();
        try {
            return await this.showBlameForFile(textEditor, fileName);
        } catch (err: any) {
            this.statusBarItem.hide();
            this.logger.error("Blame action failed", { err: err?.toString() });
            window.showErrorMessage(`${EXTENSION_NAME}: Something went wrong - ${err?.message}`);
        }
    }

    async toggleBlameForFile(textEditor?: TextEditor, fileName?: string) {
        const fileData = this.getRecordForFile(fileName);

        try {
            return fileData
                ? await this.clearBlameForFile(fileName)
                : await this.showBlameForFile(textEditor, fileName);
        } catch (err: any) {
            const blameAction = fileData ? "hide" : "show";
            this.statusBarItem.hide();
            this.logger.error(`Toggle blame failed [${blameAction}]`, { err: err?.toString() });
            window.showErrorMessage(`${EXTENSION_NAME}: Something went wrong - ${err?.message}`);
        }
    }

    async toggleBlameForActiveTextEditor() {
        const { fileName, textEditor } = await this.getActiveTextEditorAndFileName();
        return await this.toggleBlameForFile(textEditor, fileName);
    }

    async autoBlame(textEditor?: TextEditor) {
        if (!textEditor) {
            return;
        }

        const fileName = await getFileNameFromTextEditor(textEditor);

        try {
            const existingRecord = this.getRecordForFile(fileName);

            // explicit check so that we don't just skip
            // any previously unchecked files
            if (existingRecord?.workingCopy === false) {
                this.logger.debug("Skipping file, not a working copy", { fileName });
                return;
            }

            if (existingRecord) {
                this.logger.debug("Blame already exists for file, re-applying decorations", {
                    fileName,
                });
                this.decorationManager.reApplyDecorations(textEditor, existingRecord);
                return;
            }

            const { autoBlame } = workspace.getConfiguration(EXTENSION_CONFIGURATION);

            if (!autoBlame) {
                return;
            }

            return await this.showBlameForFile(textEditor, fileName);
        } catch (err: any) {
            this.statusBarItem.hide();
            this.logger.debug("Blame attemped via auto-blame, silently failing");

            if (err instanceof NotWorkingCopyError) {
                this.setRecordForFile(err.fileName, mapToDecorationRecord({ workingCopy: false }));
            }
        }
    }

    private getBlameForLine(record: DecorationRecord, line: string): Blame | undefined {
        return record.blamesByLine[line];
    }

    async trackLine(selectionChangeEvent: TextEditorSelectionChangeEvent) {
        const { textEditor } = selectionChangeEvent;
        const fileName = await getFileNameFromTextEditor(textEditor);

        try {
            if (!fileName) {
                this.logger.debug("No file found to track line");
                return;
            }

            const line = (textEditor.selection.active.line + 1).toString();
            this.activeLineDecoration?.dispose();
            await this.setUpdatedDecoration(textEditor, fileName, line);
        } catch (err) {
            this.statusBarItem.hide();
            this.logger.error("Failed to track line", { err: err?.toString() });
        }
    }

    async fetchLogAndUpdateDecoration(
        textEditor: TextEditor,
        record: DecorationRecord,
        fileName: string,
        line: string,
    ) {
        const blame = this.getBlameForLine(record, line);

        if (!blame) {
            return;
        }

        try {
            const log = await this.getLogForRevision(fileName, blame.revision);

            if (!log) {
                return;
            }

            this.updateRecordForFile(fileName, {
                logs: {
                    [blame.revision]: log,
                },
            });

            const updatedRecord = this.getRecordForFile(fileName);

            if (updatedRecord) {
                this.decorationManager.updateRevisionHoverMessages(
                    textEditor,
                    updatedRecord,
                    blame.revision,
                );
            }

            if (this.activeLine !== line) {
                this.logger.debug("Line no longer active, won't update decoration", {
                    activeLine: this.activeLine,
                    fileName,
                    line,
                });
                return;
            }

            this.logger.debug("Updating decoration with fetched log", {
                fileName,
                line,
                revision: blame.revision,
            });

            this.activeLineDecoration?.dispose();
            this.activeLineDecoration = this.decorationManager.setActiveLineDecoration(
                textEditor,
                blame,
                log,
                updatedRecord?.icons[blame.revision],
            );
        } catch (err) {
            this.statusBarItem.hide();
            this.logger.error("Failed to get log for line", { err, fileName, line });
        }
    }

    async setUpdatedDecoration(textEditor: TextEditor, fileName: string, line: string) {
        const record = this.getRecordForFile(fileName);
        const blame = record && this.getBlameForLine(record, line);

        if (!blame) {
            return;
        }

        this.logger.debug("Setting new line decoration", {
            beauROCKS: true,
            fileName,
            line,
        });

        const log = record.logs[blame.revision];

        this.activeLineDecoration = this.decorationManager.setActiveLineDecoration(
            textEditor,
            blame,
            log,
            record.icons[blame.revision],
        );

        this.activeLine = line;

        if (!log) {
            // Don't await this, we don't want it blocking
            this.fetchLogAndUpdateDecoration(textEditor, record, fileName, line);
        }
    }
}
