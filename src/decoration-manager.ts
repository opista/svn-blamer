import {
    DecorationOptions,
    DecorationRangeBehavior,
    MarkdownString,
    Range,
    TextEditor,
    TextEditorDecorationType,
    ThemeColor,
    Uri,
    window,
    workspace,
} from "vscode";

import { EXTENSION_CONFIGURATION } from "./const/extension";
import { MAX_NUMBER } from "./const/number";
import {
    createChronologicalIconMapFromFactory,
    createRandomIconMapFromItems,
    createRandomIconOrderFromFactory,
    getIndicatorColorScheme,
} from "./indicator-colors";
import {
    getChronologicalIndicatorUri,
    getRandomIndicatorUri,
    INDICATOR_COUNT,
} from "./indicator-uris";
import { mapBlameToHoverMessage } from "./mapping/map-blame-to-hover-message";
import { mapBlameToInlineMessage } from "./mapping/map-blame-to-inline-message";
import { Blame } from "./types/blame.model";
import { DecorationRecord } from "./types/decoration-record.model";
import { GutterIconHashMap } from "./types/gutter-icon-hash-map.model";
import { LogHashMap } from "./types/log-hash-map.model";

export class DecorationManager {
    createGutterDecorationType(gutterIconImage?: Uri): TextEditorDecorationType {
        return window.createTextEditorDecorationType({
            gutterIconPath: gutterIconImage,
            gutterIconSize: "contain",
            rangeBehavior: DecorationRangeBehavior.ClosedClosed,
        });
    }

    createActiveLineDecorationType(
        blame: Blame,
        log?: string,
        gutterIconImage?: Uri,
    ): TextEditorDecorationType {
        return window.createTextEditorDecorationType({
            after: {
                color: new ThemeColor("svnBlamer.blame.editorDecorationForeground"),
                contentText: mapBlameToInlineMessage(blame, log),
                margin: "0 0 0 3em",
                textDecoration: "none",
            },
            gutterIconPath: gutterIconImage,
            gutterIconSize: "contain",
            rangeBehavior: DecorationRangeBehavior.ClosedClosed,
        });
    }

    /**
     * Uses binary search to find the first index in the blames array that has a line number
     * greater than or equal to the given startLine.
     * Assumes blames array is sorted by line number.
     */
    private findFirstVisibleIndex(blames: Blame[], startLine: number): number {
        let low = 0;
        let high = blames.length - 1;

        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            const midLine = Number(blames[mid].line) - 1;

            if (midLine < startLine) {
                low = mid + 1;
            } else if (midLine > startLine) {
                high = mid - 1;
            } else {
                return mid;
            }
        }

        return low;
    }

    private createDecorationOptions(
        blames: Blame[],
        logs?: LogHashMap,
        visibleRanges?: readonly Range[],
    ): DecorationOptions[] {
        if (!blames.length) {
            return [];
        }

        const options: DecorationOptions[] = [];
        let hoverMessage: MarkdownString | undefined;

        const getHoverMessage = () => {
            if (!hoverMessage) {
                const [firstBlame] = blames;
                const log = logs?.[firstBlame.revision];
                const hoverMessageText = mapBlameToHoverMessage(firstBlame, log);
                hoverMessage = new MarkdownString(hoverMessageText, true);
            }
            return hoverMessage;
        };

        if (visibleRanges) {
            const firstLine = Number(blames[0].line) - 1;
            const lastLine = Number(blames[blames.length - 1].line) - 1;

            // Early skip: check if the entire revision range is outside all visible ranges
            if (!visibleRanges.some((r) => firstLine <= r.end.line && lastLine >= r.start.line)) {
                return [];
            }

            const addedLines = new Set<number>();
            for (const range of visibleRanges) {
                let i = this.findFirstVisibleIndex(blames, range.start.line);
                while (i < blames.length) {
                    const blame = blames[i];
                    const lineNumber = Number(blame.line) - 1;

                    if (lineNumber > range.end.line) {
                        break;
                    }

                    if (!addedLines.has(lineNumber)) {
                        options.push({
                            hoverMessage: getHoverMessage(),
                            range: new Range(lineNumber, MAX_NUMBER, lineNumber, MAX_NUMBER),
                        });
                        addedLines.add(lineNumber);
                    }
                    i++;
                }
            }
        } else {
            for (const blame of blames) {
                const lineNumber = Number(blame.line) - 1;

                options.push({
                    hoverMessage: getHoverMessage(),
                    range: new Range(lineNumber, MAX_NUMBER, lineNumber, MAX_NUMBER),
                });
            }
        }

        return options;
    }

    createGutterIconHashMap(
        fileName: string,
        revisions: string[],
        resource: Uri = Uri.file(fileName),
    ): GutterIconHashMap {
        const configuration = workspace.getConfiguration(EXTENSION_CONFIGURATION, resource);
        const { enableVisualIndicators } = configuration;

        if (!enableVisualIndicators) {
            return {};
        }

        const scheme = getIndicatorColorScheme(configuration.indicatorColorScheme);

        if (scheme !== "random") {
            return createChronologicalIconMapFromFactory(revisions, INDICATOR_COUNT, (index) =>
                getChronologicalIndicatorUri(scheme, index),
            );
        }

        const iconOrder = createRandomIconOrderFromFactory(
            fileName,
            INDICATOR_COUNT,
            revisions.length,
            getRandomIndicatorUri,
        );

        return createRandomIconMapFromItems(revisions, iconOrder);
    }

    async createAndSetDecorationsForBlame(
        textEditor: TextEditor,
        blames: Blame[],
        icons: GutterIconHashMap,
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
        const revisionsByIcon = new Map<Uri | undefined, string[]>();

        for (const revision of Object.keys(blamesByRevision)) {
            const icon = icons[revision];
            if (!revisionsByIcon.has(icon)) {
                revisionsByIcon.set(icon, []);
            }
            revisionsByIcon.get(icon)!.push(revision);
        }

        for (const [icon, revisions] of revisionsByIcon) {
            const decoration = this.createGutterDecorationType(icon);
            const allOptions: DecorationOptions[] = [];

            for (const revision of revisions) {
                revisionDecorations[revision] = decoration;
                const revisionBlames = blamesByRevision[revision];
                const options = this.createDecorationOptions(revisionBlames, logs, visibleRanges);
                allOptions.push(...options);
            }

            textEditor.setDecorations(decoration, allOptions);
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
        const decorationToRevisions = new Map<TextEditorDecorationType, string[]>();

        for (const revision in record.revisionDecorations) {
            if (!Object.prototype.hasOwnProperty.call(record.revisionDecorations, revision)) {
                continue;
            }
            const decoration = record.revisionDecorations[revision];
            if (!decorationToRevisions.has(decoration)) {
                decorationToRevisions.set(decoration, []);
            }
            decorationToRevisions.get(decoration)!.push(revision);
        }

        for (const [decoration, revisions] of decorationToRevisions) {
            const allOptions: DecorationOptions[] = [];
            for (const revision of revisions) {
                const revisionBlames = record.blamesByRevision[revision] || [];
                const options = this.createDecorationOptions(
                    revisionBlames,
                    record.logs,
                    visibleRanges,
                );
                allOptions.push(...options);
            }
            textEditor.setDecorations(decoration, allOptions);
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
        for (const rev in record.revisionDecorations) {
            if (!Object.prototype.hasOwnProperty.call(record.revisionDecorations, rev)) {
                continue;
            }
            const dec = record.revisionDecorations[rev];
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
        gutterIconImage?: Uri,
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
