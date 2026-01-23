import { readdir } from "node:fs/promises";
import path from "node:path";

import {
    DecorationOptions,
    DecorationRangeBehavior,
    extensions,
    MarkdownString,
    Range,
    TextEditor,
    TextEditorDecorationType,
    window,
    workspace,
} from "vscode";

import { EXTENSION_CONFIGURATION, EXTENSION_ID } from "./const/extension";
import { MAX_NUMBER } from "./const/number";
import { mapBlameToHoverMessage } from "./mapping/map-blame-to-hover-message";
import { mapBlameToInlineMessage } from "./mapping/map-blame-to-inline-message";
import { Blame } from "./types/blame.model";
import { DecorationRecord } from "./types/decoration-record.model";
import { GutterImagePathHashMap } from "./types/gutter-image-path-hash-map.model";
import { LogHashMap } from "./types/log-hash-map.model";

export class DecorationManager {
    private imageDir: string;
    private gutterImageFileNames?: string[];

    constructor() {
        const extensionPath = extensions.getExtension(EXTENSION_ID)!.extensionPath;
        this.imageDir = path.join(extensionPath, "dist", "img", "indicators");
    }

    private shuffle<T>(array: T[]): T[] {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    private *createGutterIconImageGenerator(files: string[]) {
        for (const file of files) {
            yield file;
        }

        return undefined;
    }

    private async gutterImageGenerator() {
        if (!this.gutterImageFileNames) {
            const fileNames = await readdir(this.imageDir);
            this.gutterImageFileNames = this.shuffle(fileNames);
        }

        return this.createGutterIconImageGenerator(this.gutterImageFileNames);
    }

    createGutterDecorationType(gutterIconImage?: string): TextEditorDecorationType {
        return window.createTextEditorDecorationType({
            gutterIconPath: gutterIconImage && path.join(this.imageDir, gutterIconImage),
            gutterIconSize: "contain",
            rangeBehavior: DecorationRangeBehavior.ClosedClosed,
        });
    }

    createActiveLineDecorationType(
        blame: Blame,
        log?: string,
        gutterIconImage?: string,
    ): TextEditorDecorationType {
        return window.createTextEditorDecorationType({
            after: {
                color: "rgba(153, 153, 153, 0.35)",
                contentText: mapBlameToInlineMessage(blame, log),
                margin: "0 0 0 3em",
                textDecoration: "none",
            },
            gutterIconPath: gutterIconImage && path.join(this.imageDir, gutterIconImage),
            gutterIconSize: "contain",
            rangeBehavior: DecorationRangeBehavior.ClosedClosed,
        });
    }

    private createDecorationOptions(blames: Blame[], logs?: LogHashMap): DecorationOptions[] {
        if (!blames.length) {
            return [];
        }

        const [firstBlame] = blames;
        const log = logs?.[firstBlame.revision];
        const hoverMessageText = mapBlameToHoverMessage(firstBlame, log);
        const hoverMessage = new MarkdownString(hoverMessageText, true);

        return blames.map((blame) => {
            const lineNumber = Number(blame.line) - 1;

            return {
                hoverMessage,
                range: new Range(lineNumber, MAX_NUMBER, lineNumber, MAX_NUMBER),
            };
        });
    }

    async createGutterImagePathHashMap(revisions: string[]) {
        const { enableVisualIndicators } = workspace.getConfiguration(EXTENSION_CONFIGURATION);

        if (!enableVisualIndicators) {
            return {};
        }

        const generator = await this.gutterImageGenerator();
        const hashMap: GutterImagePathHashMap = {};

        for (const revision of revisions) {
            if (!hashMap[revision]) {
                hashMap[revision] = generator?.next().value;
            }
        }

        return hashMap;
    }

    async createAndSetDecorationsForBlame(
        textEditor: TextEditor,
        blames: Blame[],
        icons: GutterImagePathHashMap,
        logs?: LogHashMap,
    ): Promise<
        Pick<DecorationRecord, "blamesByLine" | "blamesByRevision" | "revisionDecorations">
    > {
        const blamesByLine: Record<string, Blame> = {};
        const blamesByRevision: Record<string, Blame[]> = {};

        for (const blame of blames) {
            blamesByLine[blame.line] = blame;

            if (!blamesByRevision[blame.revision]) {
                blamesByRevision[blame.revision] = [];
            }
            blamesByRevision[blame.revision].push(blame);
        }

        const revisionDecorations: Record<string, TextEditorDecorationType> = {};

        for (const [revision, revisionBlames] of Object.entries(blamesByRevision)) {
            const decoration = this.createGutterDecorationType(icons[revision]);
            const options = this.createDecorationOptions(revisionBlames, logs);

            textEditor.setDecorations(decoration, options);
            revisionDecorations[revision] = decoration;
        }

        return {
            blamesByLine,
            blamesByRevision,
            revisionDecorations,
        };
    }

    reApplyDecorations(textEditor: TextEditor, record: DecorationRecord) {
        for (const [revision, decoration] of Object.entries(record.revisionDecorations)) {
            const revisionBlames = record.blamesByRevision[revision] || [];
            const options = this.createDecorationOptions(revisionBlames, record.logs);
            textEditor.setDecorations(decoration, options);
        }
    }

    updateRevisionHoverMessages(
        textEditor: TextEditor,
        record: DecorationRecord,
        revision: string,
    ) {
        const decoration = record.revisionDecorations[revision];
        if (!decoration) {
            return;
        }

        const revisionBlames = record.blamesByRevision[revision] || [];
        const options = this.createDecorationOptions(revisionBlames, record.logs);
        textEditor.setDecorations(decoration, options);
    }

    setActiveLineDecoration(
        textEditor: TextEditor,
        blame: Blame,
        log?: string,
        gutterIconImage?: string,
    ): TextEditorDecorationType {
        const decoration = this.createActiveLineDecorationType(blame, log, gutterIconImage);
        const lineNumber = Number(blame.line) - 1;

        textEditor.setDecorations(decoration, [
            {
                range: new Range(lineNumber, MAX_NUMBER, lineNumber, MAX_NUMBER),
            },
        ]);

        return decoration;
    }
}
