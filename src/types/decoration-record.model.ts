import { TextEditorDecorationType } from "vscode";

import { Blame } from "./blame.model";
import { GutterImagePathHashMap } from "./gutter-image-path-hash-map.model";
import { LogHashMap } from "./log-hash-map.model";

export type DecorationRecord = {
    icons: GutterImagePathHashMap;
    blames: Blame[];
    revisionDecorations: {
        [revision: string]: TextEditorDecorationType;
    };
    logs: LogHashMap;
    workingCopy: boolean;
};
