import * as assert from "assert";

import { mapLogOutputToMessage } from "../mapping/map-log-output-to-message";

suite("Log Mapping Test Suite", () => {
    test("should map log message correctly", () => {
        const xml = `
<log>
<logentry revision="3">
<msg>Test message</msg>
</logentry>
</log>`;

        const result = mapLogOutputToMessage(xml);
        assert.strictEqual(result, "Test message");
    });
});
