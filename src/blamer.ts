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
import { DecorationRecord } from "./types/decoration-record.model";
import { getFileNameFromTextEditor } from "./util/get-file-name-from-text-editor";

export class Blamer {
    private activeTextEditor: TextEditor | undefined;
    private activeFileName: string | undefined;
    private activeLine: string | undefined;
    private activeLineDecoration: TextEditorDecorationType | undefined;
    private statusBarItem: StatusBarItem;

    constructor(
        private logger: LogOutputChannel,
        private storage: Storage,
        private svn: SVN,
        private decorationManager: DecorationManager,
    ) {
        this.statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left, 0);
    }

    setStatusBarText(message: string, icon?: string) {
        const text = [icon ? `$(${icon})` : "", `${EXTENSION_NAME}:`, message];
        this.statusBarItem.text = text.filter(Boolean).join(" ");
    }

    async clearRecordForFile(fileName: string) {
        return await this.storage.delete(fileName);
    }

    async clearRecordsForAllFiles() {
        return await this.storage.clear();
    }

    async getRecordForFile(fileName?: string) {
        if (!fileName) {
            return undefined;
        }
        return await this.storage.get<DecorationRecord>(fileName);
    }

    async setRecordForFile(fileName: string, record: DecorationRecord) {
        return await this.storage.set<DecorationRecord>(fileName, record);
    }

    async updateRecordForFile(fileName: string, update: Partial<DecorationRecord>) {
        const existingRecord = await this.getRecordForFile(fileName);
        return await this.storage.set<DecorationRecord>(
            fileName,
            mapToDecorationRecord(merge(existingRecord, update)),
        );
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

        const record = await this.getRecordForFile(fileName);
        this.activeLineDecoration?.dispose();

        if (!record) {
            return;
        }

        this.logger.info("Clearing blame for file", { fileName });

        Object.values(record?.lines)?.map(({ decoration }) => decoration?.dispose?.());

        await this.clearRecordForFile(fileName);
    }

    async clearBlameForActiveTextEditor() {
        const { fileName } = await this.getActiveTextEditorAndFileName();

        return await this.clearBlameForFile(fileName);
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

        const lines = await this.decorationManager.createAndSetDecorationsForBlame(
            textEditor,
            blame,
            icons,
        );

        const record = mapToDecorationRecord({ icons, lines });

        this.statusBarItem.hide();
        await this.setRecordForFile(fileName, record);

        this.logger.info("Blame successful", { fileName });
    }

    async showBlameForActiveTextEditor() {
        const { fileName, textEditor } = await this.getActiveTextEditorAndFileName();
        try {
            return await this.showBlameForFile(textEditor, fileName);
        } catch (err: any) {
            this.statusBarItem.hide();
            this.logger.error("Blame action failed", { err });
            window.showErrorMessage(`${EXTENSION_NAME}: Something went wrong - ${err?.message}`);
        }
    }

    async toggleBlameForFile(textEditor?: TextEditor, fileName?: string) {
        const fileData = await this.getRecordForFile(fileName);

        try {
            return fileData
                ? await this.clearBlameForFile(fileName)
                : await this.showBlameForFile(textEditor, fileName);
        } catch (err: any) {
            const blameAction = fileData ? "hide" : "show";
            this.statusBarItem.hide();
            this.logger.error(`Toggle blame failed [${blameAction}]`, { err });
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
            const existingRecord = await this.getRecordForFile(fileName);

            // explicit check so that we don't just skip
            // any previously unchecked files
            if (existingRecord?.workingCopy === false) {
                this.logger.debug("Skipping file, not a working copy", { fileName });
                return;
            }

            if (existingRecord) {
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
                await this.setRecordForFile(
                    err.fileName,
                    mapToDecorationRecord({ workingCopy: false }),
                );
            }
        }
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
            await this.restorePreviousDecoration();
            await this.setUpdatedDecoration(textEditor, fileName, line);
        } catch (err) {
            this.statusBarItem.hide();
            this.logger.error("Failed to track line", { err });
        }
    }

    async restorePreviousDecoration() {
        if (!this.activeTextEditor || !this.activeFileName || !this.activeLine) {
            return;
        }

        const record = await this.getRecordForFile(this.activeFileName);
        const existingDecoration = record?.lines?.[this.activeLine];

        if (!existingDecoration) {
            return;
        }

        this.logger.debug("Reverting line-end decoration", {
            fileName: this.activeFileName,
            line: this.activeLine,
        });

        const { blame } = existingDecoration;

        existingDecoration.decoration.dispose();
        const decoration = this.decorationManager.createAndSetLineDecoration(
            this.activeTextEditor,
            blame,
            "blame",
            record.icons[blame.revision],
            record.logs[blame.revision],
        );

        await this.updateRecordForFile(this.activeFileName, {
            lines: {
                [this.activeLine]: { ...existingDecoration, decoration },
            },
        });

        this.activeTextEditor = undefined;
        this.activeFileName = undefined;
        this.activeLine = undefined;
    }

    async fetchLogAndUpdateDecoration(
        textEditor: TextEditor,
        record: DecorationRecord,
        fileName: string,
        line: string,
    ) {
        const { blame } = record.lines[line];

        try {
            const log = await this.getLogForRevision(fileName, blame.revision);

            if (!log) {
                return;
            }

            await this.updateRecordForFile(fileName, {
                logs: {
                    [blame.revision]: log,
                },
            });

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
            this.activeLineDecoration = this.decorationManager.createAndSetLineDecoration(
                textEditor,
                blame,
                "active_line",
                record.icons[blame.revision],
                log,
            );
        } catch (err) {
            this.statusBarItem.hide();
            this.logger.error("Failed to get log for line", { err, fileName, line });
        }
    }

    async setUpdatedDecoration(textEditor: TextEditor, fileName: string, line: string) {
        const record = await this.getRecordForFile(fileName);
        const existingDecoration = record?.lines?.[line];

        if (!existingDecoration) {
            return;
        }

        this.logger.debug("Setting new line decoration", {
            fileName,
            line,
        });

        const { blame } = existingDecoration;
        const log = record.logs[blame.revision];

        existingDecoration.decoration.dispose();
        this.activeLineDecoration = this.decorationManager.createAndSetLineDecoration(
            textEditor,
            blame,
            "active_line",
            record.icons[blame.revision],
            log,
        );

        this.activeTextEditor = textEditor;
        this.activeFileName = fileName;
        this.activeLine = line;

        if (!log) {
            // Don't await this, we don't want it blocking
            this.fetchLogAndUpdateDecoration(textEditor, record, fileName, line);
        }
    }
}
