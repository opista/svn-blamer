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

        assert.strictEqual(result, "123: author-name, 2 hours ago • This is a very lo...");
    });

    test("should handle log length exactly 20", () => {
        const blame: Blame = {
            author: "author-name",
            date: "2021-01-01T10:00:00.000Z",
            line: "1",
            revision: "123",
        };
        const log = "12345678901234567890"; // length 20
        const result = mapBlameToInlineMessage(blame, log);
        assert.strictEqual(result, "123: author-name, 2 hours ago • 12345678901234567890");
    });

    test("should handle log length exactly 21", () => {
        const blame: Blame = {
            author: "author-name",
            date: "2021-01-01T10:00:00.000Z",
            line: "1",
            revision: "123",
        };
        const log = "123456789012345678901"; // length 21
        const result = mapBlameToInlineMessage(blame, log);
        assert.strictEqual(result, "123: author-name, 2 hours ago • 12345678901234567...");
    });

    test("should handle empty fields", () => {
        const blame: Blame = {
            line: "1",
            revision: "123",
        };
        const result = mapBlameToInlineMessage(blame);
        assert.strictEqual(result, "123: ");
    });
});
