import { TextEditor, window, workspace } from "vscode";

import { EXTENSION_CONFIGURATION } from "./const/extension";
import { mapBlameToDecorationData } from "./mapping/map-blame-to-decoration-data";
import { mapDecorationOptions } from "./mapping/map-decoration-options";
import { Blame } from "./types/blame.model";
import { DecorationData } from "./types/decoration-data.model";
import { DecorationRecord } from "./types/decoration-record.model";
import { GutterImagePathHashMap } from "./types/gutter-image-path-hash-map.model";
import { Log } from "./types/log.model";
import { gutterImageGenerator } from "./util/gutter-image-generator";

export class DecorationManager {
    constructor() {}

    createAndSetLineDecoration(
        textEditor: TextEditor,
        decorationData: DecorationData,
        action: "blame" | "active_line",
    ) {
        const decoration = window.createTextEditorDecorationType({
            after:
                action === "active_line"
                    ? {
                          color: "rgba(153, 153, 153, 0.35)",
                          contentText: decorationData.afterMessage,
                          margin: "0 0 0 3em",
                          textDecoration: "none",
                      }
                    : undefined,
            gutterIconPath: decorationData.gutterImagePath,
            gutterIconSize: "contain",
        });

        textEditor?.setDecorations(decoration, mapDecorationOptions(decorationData));

        return decoration;
    }

    async createGutterImagePathHashMap(revisions: string[]) {
        const { enableVisualIndicators } = workspace.getConfiguration(EXTENSION_CONFIGURATION);

        if (!enableVisualIndicators) {
            return {};
        }

        const generator = await gutterImageGenerator();

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
        revisions: string[],
        logs: Log[],
    ): Promise<DecorationRecord> {
        const gutterImagePathHashMap = await this.createGutterImagePathHashMap(revisions);

        return blames.reduce<Required<DecorationRecord>>(
            (acc, blame) => {
                const metadata = mapBlameToDecorationData(
                    blame,
                    gutterImagePathHashMap[blame.revision],
                    logs.find(({ revision }) => blame.revision === revision)?.log,
                );

                const decoration = this.createAndSetLineDecoration(textEditor, metadata, "blame");

                acc.lines[blame.line] = {
                    decoration,
                    metadata,
                };

                return acc;
            },
            { lines: {}, workingCopy: true },
        );
    }

    reApplyDecorations(textEditor: TextEditor, records: DecorationRecord) {
        return Object.values(records.lines).map(({ decoration, metadata }) => {
            textEditor?.setDecorations(decoration, mapDecorationOptions(metadata));
        });
    }
}
