import { Blame } from "../types/blame.model";
import { BlamesByLine, BlamesByRevision } from "../types/decoration-record.model";

export interface Change {
    range: {
        start: { line: number };
        end: { line: number };
    };
    text: string;
}

export function handleDocumentChangeLogic(
    currentBlamesByLine: BlamesByLine,
    changes: readonly Change[],
): { blamesByLine: BlamesByLine; blamesByRevision: BlamesByRevision } {
    let updatedBlamesByLine: BlamesByLine = { ...currentBlamesByLine };

    // Process changes in reverse order (bottom to top) to handle shifts correctly
    const sortedChanges = [...changes].sort((a, b) => b.range.start.line - a.range.start.line);

    for (const change of sortedChanges) {
        const changeEndLine = change.range.end.line + 1; // Convert to 1-indexed
        const linesInserted = (change.text.match(/\n/g) || []).length;

        // Calculate how many original lines were affected (for multi-line deletions)
        const originalLinesAffected = change.range.end.line - change.range.start.line;
        const lineDelta = linesInserted - originalLinesAffected;

        if (lineDelta === 0) {
            // No line count change
            continue;
        }

        const newBlamesByLine: Record<string, Blame> = {};

        for (const [lineStr, blame] of Object.entries(updatedBlamesByLine)) {
            const lineNum = Number(lineStr);

            if (lineNum <= changeEndLine) {
                // Lines at or before the change end: keep as-is
                newBlamesByLine[lineStr] = blame;
            } else if (lineDelta < 0 && lineNum <= changeEndLine - lineDelta) {
                // Lines that were deleted: skip them
                continue;
            } else {
                // Lines after the change: shift by delta
                const newLineNum = lineNum + lineDelta;
                const shiftedBlame = { ...blame, line: String(newLineNum) };
                newBlamesByLine[String(newLineNum)] = shiftedBlame;
            }
        }

        updatedBlamesByLine = newBlamesByLine;
    }

    // Rebuild blamesByRevision from the updated blamesByLine
    const updatedBlamesByRevision: BlamesByRevision = {};
    for (const blame of Object.values(updatedBlamesByLine)) {
        if (!updatedBlamesByRevision[blame.revision]) {
            updatedBlamesByRevision[blame.revision] = [];
        }
        updatedBlamesByRevision[blame.revision].push(blame);
    }

    return { blamesByLine: updatedBlamesByLine, blamesByRevision: updatedBlamesByRevision };
}
