import { Blame } from "../types/blame.model";
import { BlamesByLine, BlamesByRevision } from "../types/decoration-record.model";

export interface Change {
    range: {
        start: { line: number; character: number };
        end: { line: number; character: number };
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
        // Calculate lines inserted based on newlines in text.
        const linesInserted = (change.text.match(/\n/g) || []).length;

        // Calculate how many original lines were affected (for multi-line deletions)
        const originalLinesAffected = change.range.end.line - change.range.start.line;
        const lineDelta = linesInserted - originalLinesAffected;

        if (lineDelta === 0) {
            // No line count change
            continue;
        }

        const newBlamesByLine: Record<string, Blame> = {};

        // Determine the boundary line for unaffected content.
        // If the change starts at character 0, the line itself is pushed down (for insertion) or deleted (for deletion).
        // If it starts > 0, the line itself stays (split or content removed from it), and subsequent lines are affected.
        // change.range.start.line is 0-indexed.
        // If char > 0: boundary is start.line + 1 (1-indexed line number). The start line is kept.
        // If char == 0: boundary is start.line. The start line is affected (shifted/deleted).

        let boundaryLine = change.range.start.line;
        if (change.range.start.character > 0) {
            boundaryLine += 1;
        }

        for (const [lineStr, blame] of Object.entries(updatedBlamesByLine)) {
            const lineNum = Number(lineStr);

            if (lineNum <= boundaryLine) {
                // Lines strictly before the change boundary: keep as-is
                newBlamesByLine[lineStr] = blame;
            } else if (lineDelta < 0 && lineNum <= boundaryLine - lineDelta) {
                // Lines that were within the deleted range: skip them
                // For deletion, if char==0, boundary=start.line.
                // Affected lines: start.line + 1 ... start.line + deleted.
                // Limit: boundary + deleted.
                // If char>0, boundary=start.line+1.
                // Affected lines: start.line + 2 ... start.line + 1 + deleted.

                // Wait, for deletion:
                // Start line is always kept if char > 0? Yes, it becomes shorter but stays as line X.
                // If char == 0, start line is removed/merged?
                // If I delete line 2 fully (at char 0). It's gone.
                // If I delete from line 2 char 5 to line 3 char 0.
                // Line 2 stays. Line 3 merges into 2.
                // So line 2 is kept. Line 3 is gone.
                // boundary = 2 + 1 = 3? No start line is 1 (index 1 = line 2).
                // char=5 > 0. boundary = 1 + 1 = 2.
                // Line 2 (2) <= 2. Kept. Correct.
                // Line 3 (3) > 2.
                // lineDelta = -1. limit = 2 - (-1) = 3.
                // Line 3 <= 3. Deleted/Skipped. Correct.

                // If deletion at char 0.
                // Line 2 (index 1). Start line 1. Char 0.
                // boundary = 1.
                // Line 2 (2) > 1.
                // limit = 1 - (-1) = 2.
                // Line 2 <= 2. Deleted. Correct.

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
