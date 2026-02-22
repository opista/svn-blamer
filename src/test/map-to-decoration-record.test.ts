import * as assert from "assert";

import { mapToDecorationRecord } from "../mapping/map-to-decoration-record";
import { DecorationRecord } from "../types/decoration-record.model";

suite("Map To Decoration Record Test Suite", () => {
    test("should return default record when input is empty", () => {
        const input: Partial<DecorationRecord> = {};
        const result = mapToDecorationRecord(input);

        assert.deepStrictEqual(result.icons, {});
        assert.deepStrictEqual(result.blamesByLine, {});
        assert.deepStrictEqual(result.blamesByRevision, {});
        assert.deepStrictEqual(result.revisionDecorations, {});
        assert.deepStrictEqual(result.logs, {});
        assert.strictEqual(result.workingCopy, true);
    });

    test("should merge partial record with default record", () => {
        const input: Partial<DecorationRecord> = {
            workingCopy: false,
        };
        const result = mapToDecorationRecord(input);

        assert.strictEqual(result.workingCopy, false);
        // Ensure other properties are still defaults
        assert.deepStrictEqual(result.icons, {});
    });

    test("should deep merge nested objects", () => {
        const input: Partial<DecorationRecord> = {
            icons: {
                "rev1": "path/to/icon.png"
            }
        };
        const result = mapToDecorationRecord(input);

        assert.strictEqual(result.icons["rev1"], "path/to/icon.png");
        assert.deepStrictEqual(result.blamesByLine, {});
    });

    test("should overwrite default properties if provided", () => {
        const input: Partial<DecorationRecord> = {
            workingCopy: false,
            icons: { "rev2": "icon2" }
        };
        const result = mapToDecorationRecord(input);

        assert.strictEqual(result.workingCopy, false);
        assert.strictEqual(result.icons["rev2"], "icon2");
    });
});
