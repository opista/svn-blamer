import { TextEditorDecorationType } from "vscode";

import { Blame } from "./blame.model";
import { GutterImagePathHashMap } from "./gutter-image-path-hash-map.model";
import { LogHashMap } from "./log-hash-map.model";

export type BlamesByLine = {
    [line: string]: Blame;
};

export type BlamesByRevision = {
    [revision: string]: Blame[];
};

export type DecorationRecord = {
    icons: GutterImagePathHashMap;
    blamesByLine: BlamesByLine;
    blamesByRevision: BlamesByRevision;
    revisionDecorations: {
        [revision: string]: TextEditorDecorationType;
    };
    logs: LogHashMap;
    workingCopy: boolean;
};
