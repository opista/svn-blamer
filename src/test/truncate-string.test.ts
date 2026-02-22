import * as assert from "assert";

import { truncateString } from "../util/truncate-string";

suite("Truncate String Test Suite", () => {
    test("should return empty string for undefined input", () => {
        assert.strictEqual(truncateString(undefined), "");
    });

    test("should return empty string for empty input", () => {
        assert.strictEqual(truncateString(""), "");
    });

    test("should return original string if length is less than or equal to 17", () => {
        const str = "12345678901234567";
        assert.strictEqual(truncateString(str), str);
    });

    test("should truncate string if length is greater than 17", () => {
        const str = "123456789012345678";
        assert.strictEqual(truncateString(str), "123456789012345678...");
    });

    test("should truncate long string correctly", () => {
        const str = "1234567890123456789012345";
        assert.strictEqual(truncateString(str), "12345678901234567890...");
    });

    test("should trim whitespace before appending ellipsis", () => {
        const str = "12345678901234567   ";
        assert.strictEqual(truncateString(str), "12345678901234567...");
    });
});
