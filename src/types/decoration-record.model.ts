import { TextEditorDecorationType } from "vscode";

import { Blame } from "./blame.model";
import { GutterIconHashMap } from "./gutter-icon-hash-map.model";
import { LogHashMap } from "./log-hash-map.model";

export type BlamesByLine = {
    [line: string]: Blame;
};

export type BlamesByRevision = {
    [revision: string]: Blame[];
};

export type DecorationRecord = {
    icons: GutterIconHashMap;
    blamesByLine: BlamesByLine;
    blamesByRevision: BlamesByRevision;
    revisionDecorations: {
        [revision: string]: TextEditorDecorationType;
    };
    logs: LogHashMap;
    workingCopy: boolean;
    indicatorRefreshVersion?: number;
};
