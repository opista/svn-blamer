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

    constructor() {
        const extensionPath = extensions.getExtension(EXTENSION_ID)!.extensionPath;
        this.imageDir = path.join(extensionPath, "dist", "img");
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
        const extensionPath = extensions.getExtension(EXTENSION_ID)?.extensionPath;

        if (!extensionPath) {
            throw new Error("Unable to find extension path");
        }
        const files = await readdir(this.imageDir);

        return this.generator(files);
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
        return blames.reduce<Required<DecorationRecord["lines"]>>((acc, blame) => {
            const decoration = this.createAndSetLineDecoration(
                textEditor,
                blame,
                "blame",
                icons[blame.revision],
                logs?.[blame.revision],
            );

            acc[blame.line] = {
                blame,
                decoration,
            };

            return acc;
        }, {});
    }

    reApplyDecorations(textEditor: TextEditor, record: DecorationRecord) {
        return Object.values(record.lines).map(({ blame, decoration }) => {
            textEditor?.setDecorations(
                decoration,
                mapDecorationOptions(blame, record.logs[blame.line]),
            );
        });
    }
}
