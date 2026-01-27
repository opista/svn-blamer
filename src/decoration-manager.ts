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

    private getOptionsForVisibleRanges(
        visibleRanges: readonly Range[],
        blamesByLine: Record<string, Blame>,
        revisionDecorations: Record<string, TextEditorDecorationType>,
        logs?: LogHashMap,
    ): Map<TextEditorDecorationType, DecorationOptions[]> {
        const optionsByDecoration = new Map<TextEditorDecorationType, DecorationOptions[]>();
        const hoverCache = new Map<string, MarkdownString>();

        for (const range of visibleRanges) {
            for (let i = range.start.line; i <= range.end.line; i++) {
                const line = (i + 1).toString();
                const blame = blamesByLine[line];
                if (!blame) {
                    continue;
                }

                const decoration = revisionDecorations[blame.revision];
                if (!decoration) {
                    continue;
                }

                let hoverMessage = hoverCache.get(blame.revision);
                if (!hoverMessage) {
                    const log = logs?.[blame.revision];
                    const text = mapBlameToHoverMessage(blame, log);
                    hoverMessage = new MarkdownString(text, true);
                    hoverCache.set(blame.revision, hoverMessage);
                }

                if (!optionsByDecoration.has(decoration)) {
                    optionsByDecoration.set(decoration, []);
                }

                optionsByDecoration.get(decoration)!.push({
                    hoverMessage,
                    range: new Range(i, MAX_NUMBER, i, MAX_NUMBER),
                });
            }
        }
        return optionsByDecoration;
    }

    private createDecorationOptions(
        blames: Blame[],
        logs?: LogHashMap,
        visibleRanges?: readonly Range[],
    ): DecorationOptions[] {
        if (!blames.length) {
            return [];
        }

        const [firstBlame] = blames;
        const log = logs?.[firstBlame.revision];
        const hoverMessageText = mapBlameToHoverMessage(firstBlame, log);
        const hoverMessage = new MarkdownString(hoverMessageText, true);

        const options: DecorationOptions[] = [];

        for (const blame of blames) {
            const lineNumber = Number(blame.line) - 1;

            if (visibleRanges) {
                const isVisible = visibleRanges.some(
                    (range) => lineNumber >= range.start.line && lineNumber <= range.end.line,
                );
                if (!isVisible) {
                    continue;
                }
            }

            options.push({
                hoverMessage,
                range: new Range(lineNumber, MAX_NUMBER, lineNumber, MAX_NUMBER),
            });
        }

        return options;
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
        visibleRanges?: readonly Range[],
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
        const revisionsByIcon = new Map<string, string[]>();

        for (const revision of Object.keys(blamesByRevision)) {
            const icon = icons[revision] || "";
            if (!revisionsByIcon.has(icon)) {
                revisionsByIcon.set(icon, []);
            }
            revisionsByIcon.get(icon)!.push(revision);
        }

        const decorationsByIcon = new Map<string, TextEditorDecorationType>();

        for (const [icon, revisions] of revisionsByIcon) {
            const decoration = this.createGutterDecorationType(icon || undefined);
            decorationsByIcon.set(icon, decoration);
            for (const revision of revisions) {
                revisionDecorations[revision] = decoration;
            }
        }

        if (visibleRanges) {
            const optionsByDecoration = this.getOptionsForVisibleRanges(
                visibleRanges,
                blamesByLine,
                revisionDecorations,
                logs,
            );
            for (const decoration of decorationsByIcon.values()) {
                textEditor.setDecorations(decoration, optionsByDecoration.get(decoration) || []);
            }
        } else {
            for (const [icon, revisions] of revisionsByIcon) {
                const decoration = decorationsByIcon.get(icon)!;
                const allOptions: DecorationOptions[] = [];

                for (const revision of revisions) {
                    const revisionBlames = blamesByRevision[revision];
                    const options = this.createDecorationOptions(revisionBlames, logs);
                    allOptions.push(...options);
                }

                textEditor.setDecorations(decoration, allOptions);
            }
        }

        return {
            blamesByLine,
            blamesByRevision,
            revisionDecorations,
        };
    }

    reApplyDecorations(
        textEditor: TextEditor,
        record: DecorationRecord,
        visibleRanges?: readonly Range[],
    ) {
        if (visibleRanges) {
            const optionsByDecoration = this.getOptionsForVisibleRanges(
                visibleRanges,
                record.blamesByLine,
                record.revisionDecorations,
                record.logs,
            );

            const uniqueDecorations = new Set(Object.values(record.revisionDecorations));
            for (const decoration of uniqueDecorations) {
                textEditor.setDecorations(decoration, optionsByDecoration.get(decoration) || []);
            }
        } else {
            const decorationToRevisions = new Map<TextEditorDecorationType, string[]>();

            for (const [revision, decoration] of Object.entries(record.revisionDecorations)) {
                if (!decorationToRevisions.has(decoration)) {
                    decorationToRevisions.set(decoration, []);
                }
                decorationToRevisions.get(decoration)!.push(revision);
            }

            for (const [decoration, revisions] of decorationToRevisions) {
                const allOptions: DecorationOptions[] = [];
                for (const revision of revisions) {
                    const revisionBlames = record.blamesByRevision[revision] || [];
                    const options = this.createDecorationOptions(revisionBlames, record.logs);
                    allOptions.push(...options);
                }
                textEditor.setDecorations(decoration, allOptions);
            }
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

        const revisionsSharingDecoration: string[] = [];
        for (const [rev, dec] of Object.entries(record.revisionDecorations)) {
            if (dec === decoration) {
                revisionsSharingDecoration.push(rev);
            }
        }

        const allOptions: DecorationOptions[] = [];
        for (const rev of revisionsSharingDecoration) {
            const revisionBlames = record.blamesByRevision[rev] || [];
            const options = this.createDecorationOptions(revisionBlames, record.logs);
            allOptions.push(...options);
        }

        textEditor.setDecorations(decoration, allOptions);
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
