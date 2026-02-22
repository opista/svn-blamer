import * as assert from "assert";

import { Blame } from "../types/blame.model";
import { BlamesByLine } from "../types/decoration-record.model";
import { Change, handleDocumentChangeLogic } from "../util/handle-document-change";

suite("Handle Document Change Logic Test Suite", () => {
    const createBlame = (line: string, revision: string): Blame => ({
        line,
        revision,
        author: "author",
        date: "date",
    });

    test("should return original blames if no changes provided", () => {
        const blames: BlamesByLine = {
            "1": createBlame("1", "100"),
            "2": createBlame("2", "100"),
        };
        const result = handleDocumentChangeLogic(blames, []);
        assert.deepStrictEqual(result.blamesByLine, blames);
        assert.strictEqual(Object.keys(result.blamesByRevision).length, 1);
        assert.strictEqual(result.blamesByRevision["100"].length, 2);
    });

    test("should handle insertion at start of line (prepend - shift down)", () => {
        const blames: BlamesByLine = {
            "1": createBlame("1", "100"),
            "2": createBlame("2", "100"),
        };

        // Prepend newline to line 1.
        // Range(0, 0) to (0, 0). Text "\n".
        const changes: Change[] = [
            {
                range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
                text: "\n",
            },
        ];

        const result = handleDocumentChangeLogic(blames, changes);

        // Line 1 becomes Line 2. Line 2 becomes Line 3.
        assert.strictEqual(result.blamesByLine["2"].line, "2");
        assert.strictEqual(result.blamesByLine["3"].line, "3");
        assert.strictEqual(result.blamesByLine["1"], undefined, "Line 1 should be shifted");
    });

    test("should handle insertion at end of line (append - keep line)", () => {
        const blames: BlamesByLine = {
            "1": createBlame("1", "100"),
            "2": createBlame("2", "100"),
        };

        // Append newline to line 1 (e.g., press Enter at end of line).
        // Range(0, 10) to (0, 10). Text "\n".
        const changes: Change[] = [
            {
                range: { start: { line: 0, character: 10 }, end: { line: 0, character: 10 } },
                text: "\n",
            },
        ];

        const result = handleDocumentChangeLogic(blames, changes);

        // Line 1 stays at 1. Line 2 moves to 3.
        // New line at 2 has no blame.
        assert.strictEqual(result.blamesByLine["1"].line, "1", "Line 1 should stay");
        assert.strictEqual(result.blamesByLine["3"].line, "3", "Line 2 should shift to 3");
        assert.strictEqual(result.blamesByLine["2"], undefined, "New line 2 should have no blame");
    });

    test("should handle deletion of full line (shift up)", () => {
        const blames: BlamesByLine = {
            "1": createBlame("1", "100"),
            "2": createBlame("2", "100"),
            "3": createBlame("3", "100"),
        };

        // Delete line 2.
        // Range(1, 0) to (2, 0). Text "".
        const changes: Change[] = [
            {
                range: { start: { line: 1, character: 0 }, end: { line: 2, character: 0 } },
                text: "",
            },
        ];

        const result = handleDocumentChangeLogic(blames, changes);

        // Line 1 stays.
        assert.strictEqual(result.blamesByLine["1"].line, "1");
        // Line 2 deleted.
        // Line 3 shifts to 2.
        assert.strictEqual(result.blamesByLine["2"].line, "2", "Line 3 should shift to 2");
        assert.strictEqual(result.blamesByLine["3"], undefined, "Line 3 shifted up");
    });

    test("should handle deletion within line (merge - keep line)", () => {
        const blames: BlamesByLine = {
            "1": createBlame("1", "100"),
            "2": createBlame("2", "100"),
            "3": createBlame("3", "100"),
        };

        // Delete from mid line 2 to start of line 3 (merging 3 into 2).
        // Range(1, 5) to (2, 0). Text "".
        const changes: Change[] = [
            {
                range: { start: { line: 1, character: 5 }, end: { line: 2, character: 0 } },
                text: "",
            },
        ];

        const result = handleDocumentChangeLogic(blames, changes);

        // Line 1 stays.
        assert.strictEqual(result.blamesByLine["1"].line, "1");
        // Line 2 stays (content from 3 merged into it).
        assert.strictEqual(result.blamesByLine["2"].line, "2");
        // Line 3 deleted (merged).
        assert.strictEqual(result.blamesByLine["3"], undefined);
    });
});
