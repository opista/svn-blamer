import { readdir } from "node:fs/promises";
import path from "node:path";

import { DecorationOptions, extensions, TextEditor, TextEditorDecorationType, window, workspace } from "vscode";

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
    ): Promise<DecorationRecord["lines"]> {
        const lines: Required<DecorationRecord["lines"]> = {};

        // Group blames by revision to reuse decoration types
        const blamesByRevision: Record<string, Blame[]> = {};
        for (const blame of blames) {
            if (!blamesByRevision[blame.revision]) {
                blamesByRevision[blame.revision] = [];
            }
            blamesByRevision[blame.revision].push(blame);
        }

        for (const revision in blamesByRevision) {
            const group = blamesByRevision[revision];
            const iconPath = icons[revision];
            const log = logs?.[revision];

            const decoration = window.createTextEditorDecorationType({
                gutterIconPath: iconPath && path.join(this.imageDir, iconPath),
                gutterIconSize: "contain",
            });

            const allOptions: DecorationOptions[] = [];

            for (const blame of group) {
                const options = mapDecorationOptions(blame, log);
                allOptions.push(...options);

                lines[blame.line] = {
                    blame,
                    decoration,
                };
            }

            textEditor.setDecorations(decoration, allOptions);
        }

        return lines;
    }

    reApplyDecorations(textEditor: TextEditor, record: DecorationRecord) {
        const decorationsMap = new Map<TextEditorDecorationType, DecorationOptions[]>();

        Object.values(record.lines).forEach(({ blame, decoration }) => {
            const options = mapDecorationOptions(blame, record.logs[blame.revision]);
            if (!decorationsMap.has(decoration)) {
                decorationsMap.set(decoration, []);
            }
            decorationsMap.get(decoration)!.push(...options);
        });

        decorationsMap.forEach((options, decoration) => {
            textEditor.setDecorations(decoration, options);
        });
    }
}
