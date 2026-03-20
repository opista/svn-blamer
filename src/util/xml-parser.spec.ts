import * as assert from "assert";

import { createXmlParser } from "./xml-parser";

suite("XML Parser Test Suite", () => {
    test("should merge default options with provided options", () => {
        const parser = createXmlParser({ alwaysCreateTextNode: true });

        const xml = `<test id="1">value</test>`;
        const result = parser.parse(xml);

        assert.deepEqual(result, {
            test: {
                attributes: { id: "1" },
                text: "value",
            },
        });
    });
});
