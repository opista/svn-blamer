import * as assert from "assert";
import { Uri } from "vscode";

import { DecorationRecord } from "../types/decoration-record.model";
import { mapToDecorationRecord } from "./map-to-decoration-record";

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
        assert.strictEqual(result.indicatorRefreshVersion, 0);
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
        const icon = Uri.parse("data:image/svg+xml;base64,aWNvbg==");
        const input: Partial<DecorationRecord> = {
            icons: {
                rev1: icon,
            },
        };
        const result = mapToDecorationRecord(input);

        assert.strictEqual(result.icons["rev1"], icon);
        assert.deepStrictEqual(result.blamesByLine, {});
    });

    test("should overwrite default properties if provided", () => {
        const icon = Uri.parse("data:image/svg+xml;base64,aWNvbjI=");
        const input: Partial<DecorationRecord> = {
            workingCopy: false,
            icons: { rev2: icon },
        };
        const result = mapToDecorationRecord(input);

        assert.strictEqual(result.workingCopy, false);
        assert.strictEqual(result.icons["rev2"], icon);
    });
});
