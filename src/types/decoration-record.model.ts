import { TextEditorDecorationType } from "vscode";

import { Blame } from "./blame.model";
import { GutterImagePathHashMap } from "./gutter-image-path-hash-map.model";
import { LogHashMap } from "./log-hash-map.model";

export type DecorationRecord = {
    icons: GutterImagePathHashMap;
    lines: {
        [key: string]: {
            blame: Blame;
            // decoration: TextEditorDecorationType; // Deprecated: Decorations are now shared in 'revisions'
        };
    };
    revisions: {
        [revision: string]: {
            decoration: TextEditorDecorationType;
            lines: string[];
        };
    };
    logs: LogHashMap;
    workingCopy: boolean;
};
