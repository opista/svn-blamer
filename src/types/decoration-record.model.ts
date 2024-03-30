import { TextEditorDecorationType } from "vscode";

import { DecorationData } from "./decoration-data.model";

export type DecorationRecord = {
    lines: {
        [key: string]: {
            decoration: TextEditorDecorationType;
            metadata: DecorationData;
        };
    };
    workingCopy: boolean;
};
