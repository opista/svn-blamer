import { readdir } from "node:fs/promises";
import path from "node:path";

import { extensions, TextEditor, window, workspace } from "vscode";

import { EXTENSION_CONFIGURATION, EXTENSION_ID } from "./const/extension";
import { mapBlameToInlineMessage } from "./mapping/map-blame-to-inline-message";
import { mapDecorationOptions } from "./mapping/map-decoration-options";
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

    private *generator(files: string[]) {
        while (files.length) {
            const index = Math.floor(Math.random() * files.length);
            const imagePath = files[index];
            files.splice(index, 1);

            yield imagePath;
        }

        return undefined;
    }

    private async gutterImageGenerator() {
        if (!this.gutterImageFileNames) {
            this.gutterImageFileNames = await readdir(this.imageDir);
        }

        return this.generator([...this.gutterImageFileNames]);
    }

    createAndSetLineDecoration(
        textEditor: TextEditor,
        blame: Blame,
        action: "blame" | "active_line",
        gutterIconImage?: string,
        log?: string,
    ) {
        const decoration = window.createTextEditorDecorationType({
            after:
                action === "active_line"
                    ? {
                          color: "rgba(153, 153, 153, 0.35)",
                          contentText: mapBlameToInlineMessage(blame, log),
                          margin: "0 0 0 3em",
                          textDecoration: "none",
                      }
                    : undefined,
            gutterIconPath: gutterIconImage && path.join(this.imageDir, gutterIconImage),
            gutterIconSize: "contain",
        });

        textEditor?.setDecorations(decoration, mapDecorationOptions(blame, log));

        return decoration;
    }

    async createGutterImagePathHashMap(revisions: string[]) {
        const { enableVisualIndicators } = workspace.getConfiguration(EXTENSION_CONFIGURATION);

        if (!enableVisualIndicators) {
            return {};
        }

        const generator = await this.gutterImageGenerator();

        return revisions.reduce<GutterImagePathHashMap>((hashMap, revision: string) => {
            const existingValue = hashMap[revision];

            if (existingValue) {
                return hashMap;
            }

            return {
                ...hashMap,
                [revision]: generator?.next().value,
            };
        }, {});
    }

    async createAndSetDecorationsForBlame(
        textEditor: TextEditor,
        blames: Blame[],
        icons: GutterImagePathHashMap,
        logs?: LogHashMap,
    ): Promise<Pick<DecorationRecord, "lines" | "revisions">> {
        // Group blames by revision to reuse decoration types
        const lines: DecorationRecord["lines"] = {};
        const revisions: DecorationRecord["revisions"] = {};
        const blamesByRevision: { [revision: string]: Blame[] } = {};

        // 1. Group blames
        blames.forEach((blame) => {
            if (!blamesByRevision[blame.revision]) {
                blamesByRevision[blame.revision] = [];
            }
            blamesByRevision[blame.revision].push(blame);
            lines[blame.line] = { blame };
        });

        // 2. Create one decoration type per revision and apply it
        Object.entries(blamesByRevision).forEach(([revision, groupBlames]) => {
            const icon = icons[revision];
            const log = logs?.[revision];

            const decoration = window.createTextEditorDecorationType({
                gutterIconPath: icon && path.join(this.imageDir, icon),
                gutterIconSize: "contain",
                // 'after' is undefined for bulk blame decorations
            });

            // Flatten all decoration options for this revision
            const allOptions = groupBlames.flatMap((blame) => mapDecorationOptions(blame, log));

            textEditor.setDecorations(decoration, allOptions);

            revisions[revision] = {
                decoration,
                lines: groupBlames.map((b) => b.line),
            };
        });

        return { lines, revisions };
    }

    reApplyDecorations(textEditor: TextEditor, record: DecorationRecord) {
        // Apply shared decorations
        Object.entries(record.revisions).forEach(([revision, { decoration, lines }]) => {
            const log = record.logs[revision];
            const allOptions = lines.flatMap((line) => {
                const blame = record.lines[line]?.blame;
                if (!blame) {return [];}
                return mapDecorationOptions(blame, log);
            });
            textEditor?.setDecorations(decoration, allOptions);
        });
    }
}
