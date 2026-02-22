import * as assert from "assert";

import { mapBlameOutputToBlameModel } from "../mapping/map-blame-output-to-blame-model";

suite("Blame Mapping Test Suite", () => {
    test("should map single entry correctly", () => {
        const xml = `
<blame>
<target path="readme.txt">
<entry line-number="1">
<commit revision="3">
<author>sally</author>
<date>2008-05-25T19:12:31.428953Z</date>
</commit>
</entry>
</target>
</blame>`;

        const result = mapBlameOutputToBlameModel(xml);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].author, "sally");
        assert.strictEqual(result[0].revision, "3");
        assert.strictEqual(result[0].line, "1");
    });

    test("should map multiple entries correctly", () => {
        const xml = `
<blame>
<target path="readme.txt">
<entry line-number="1">
<commit revision="3">
<author>sally</author>
<date>2008-05-25T19:12:31.428953Z</date>
</commit>
</entry>
<entry line-number="2">
<commit revision="4">
<author>bob</author>
<date>2008-05-26T19:12:31.428953Z</date>
</commit>
</entry>
</target>
</blame>`;

        const result = mapBlameOutputToBlameModel(xml);
        assert.strictEqual(result.length, 2);
        assert.strictEqual(result[0].author, "sally");
        assert.strictEqual(result[1].author, "bob");
    });

    test("should handle entries with attributes on author (if any)", () => {
        // Simulating author having attributes which makes fast-xml-parser return object instead of string (without alwaysCreateTextNode)
        // But our code handles it.
        const xml = `
<blame>
<target path="readme.txt">
<entry line-number="1">
<commit revision="3">
<author foo="bar">sally</author>
<date>2008-05-25T19:12:31.428953Z</date>
</commit>
</entry>
</target>
</blame>`;

        const result = mapBlameOutputToBlameModel(xml);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].author, "sally");
    });
});
