import { DecorationOptions, MarkdownString, Range } from "vscode";

import { MAX_NUMBER } from "../const/number";
import { Blame } from "../types/blame.model";
import { mapBlameToHoverMessage } from "./map-blame-to-hover-message";

export const mapDecorationOptions = (blame: Blame, log?: string): DecorationOptions[] => {
    const hoverMessage = mapBlameToHoverMessage(blame, log);
    const lineNumber = Number(blame.line) - 1;

    return [
        {
            hoverMessage: new MarkdownString(hoverMessage),
            range: new Range(lineNumber, MAX_NUMBER, lineNumber, MAX_NUMBER),
        },
    ];
};
