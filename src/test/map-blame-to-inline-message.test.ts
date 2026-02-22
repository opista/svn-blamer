import * as assert from "assert";
import { Settings } from "luxon";
import { mapBlameToInlineMessage } from "../mapping/map-blame-to-inline-message";
import { Blame } from "../types/blame.model";

suite("Map Blame to Inline Message Test Suite", () => {
    // Mock current time to 2021-01-01T12:00:00.000Z
    const mockNow = 1609502400000;
    let originalNow: () => number;

    setup(() => {
        originalNow = Settings.now;
        Settings.now = () => mockNow;
    });

    teardown(() => {
        Settings.now = originalNow;
    });

    test("should format valid blame correctly", () => {
        const blame: Blame = {
            author: "author-name",
            date: "2021-01-01T10:00:00.000Z", // 2 hours ago
            line: "1",
            revision: "123",
        };
        const log = "commit message";
        const result = mapBlameToInlineMessage(blame, log);

        // "2 hours ago" might vary slightly based on locale but usually consistent in test env.
        // Re-checking luxon behavior: toRelative() default locale is system's.
        // It should be "2 hours ago".

        // Since we can't be 100% sure about locale, let's just check the structure.
        assert.strictEqual(result, "123: author-name, 2 hours ago • commit message");
    });

    test("should handle missing log", () => {
        const blame: Blame = {
            author: "author-name",
            date: "2021-01-01T10:00:00.000Z",
            line: "1",
            revision: "123",
        };
        const result = mapBlameToInlineMessage(blame);
        assert.strictEqual(result, "123: author-name, 2 hours ago");
    });

    test("should handle missing author", () => {
        const blame: Blame = {
            date: "2021-01-01T10:00:00.000Z",
            line: "1",
            revision: "123",
        };
        const log = "commit message";
        const result = mapBlameToInlineMessage(blame, log);
        // "author" is undefined.
        // authorAndTime = [undefined, "2 hours ago"].filter(Boolean).join(", ") -> "2 hours ago"
        assert.strictEqual(result, "123: 2 hours ago • commit message");
    });

    test("should handle missing date", () => {
        const blame: Blame = {
            author: "author-name",
            line: "1",
            revision: "123",
        };
        const log = "commit message";
        const result = mapBlameToInlineMessage(blame, log);
        // date is undefined.
        // timeRelative = undefined && ... -> undefined
        // authorAndTime = ["author-name", undefined].filter(Boolean).join(", ") -> "author-name"
        assert.strictEqual(result, "123: author-name • commit message");
    });

    test("should handle invalid date", () => {
        const blame: Blame = {
            author: "author-name",
            date: "invalid-date",
            line: "1",
            revision: "123",
        };
        const log = "commit message";
        const result = mapBlameToInlineMessage(blame, log);

        // DateTime.fromISO("invalid-date") returns invalid DateTime.
        // toRelative() on invalid DateTime returns null.
        // timeRelative = null.
        // authorAndTime = ["author-name", null].filter(Boolean) -> "author-name"

        assert.strictEqual(result, "123: author-name • commit message");
    });

    test("should truncate long log correctly", () => {
        const blame: Blame = {
            author: "author-name",
            date: "2021-01-01T10:00:00.000Z",
            line: "1",
            revision: "123",
        };
        const log = "This is a very long log message that should be truncated";
        const result = mapBlameToInlineMessage(blame, log);

        // truncateString behavior:
        // length > 17 -> substring(0, 20).trim() + "..."
        // "This is a very long log message that should be truncated" (length 56)
        // substring(0, 20) -> "This is a very long "
        // trim() -> "This is a very long"
        // + "..." -> "This is a very long..."

        assert.strictEqual(result, "123: author-name, 2 hours ago • This is a very long...");
    });

    test("should handle log length exactly 17", () => {
         const blame: Blame = {
            author: "author-name",
            date: "2021-01-01T10:00:00.000Z",
            line: "1",
            revision: "123",
        };
        const log = "12345678901234567"; // length 17
        const result = mapBlameToInlineMessage(blame, log);
        assert.strictEqual(result, "123: author-name, 2 hours ago • 12345678901234567");
    });

    test("should handle log length exactly 18", () => {
         const blame: Blame = {
            author: "author-name",
            date: "2021-01-01T10:00:00.000Z",
            line: "1",
            revision: "123",
        };
        const log = "123456789012345678"; // length 18
        // > 17 so truncates.
        // substring(0, 20) is "123456789012345678"
        // trim() is same
        // + "..." -> "123456789012345678..."
        const result = mapBlameToInlineMessage(blame, log);
        assert.strictEqual(result, "123: author-name, 2 hours ago • 123456789012345678...");
    });

    test("should handle empty fields", () => {
        const blame: Blame = {
            line: "1",
            revision: "123",
        };
        // missing author, missing date.
        const result = mapBlameToInlineMessage(blame);
        // authorAndTime = [undefined, undefined] -> ""
        // prefix = "123: "
        // log is undefined -> truncateString(undefined) -> ""
        // [prefix, ""].filter(Boolean) -> ["123: "] -> "123: "

        // Wait, prefix is "123: " (trailing space) if authorAndTime is empty string.
        // Let's check logic:
        // const authorAndTime = [author, timeRelative].filter(Boolean).join(", ");
        // if author and timeRelative are undefined, authorAndTime is "".
        // const prefix = `${revision}: ${authorAndTime}`; -> "123: "

        // const truncatedLog = truncateString(log); -> ""

        // return [prefix, truncatedLog].filter(Boolean).join(" • ");
        // ["123: ", ""].filter(Boolean) -> ["123: "] -> "123: "

        assert.strictEqual(result, "123: ");
    });
});
