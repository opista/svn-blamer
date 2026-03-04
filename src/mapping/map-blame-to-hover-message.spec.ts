import * as assert from "assert";
import { Settings, Zone } from "luxon";

import { Blame } from "../types/blame.model";
import { mapBlameToHoverMessage } from "./map-blame-to-hover-message";

suite("Map Blame to Hover Message Test Suite", () => {
    // Save original settings to restore after tests
    let originalNow: () => number;
    let originalDefaultLocale: string;
    let originalDefaultZone: string | Zone;

    suiteSetup(() => {
        originalNow = Settings.now;
        originalDefaultLocale = Settings.defaultLocale;
        originalDefaultZone = Settings.defaultZone;
    });

    setup(() => {
        // Fix "now" to a specific date for relative time calculations
        // 2021-01-01T12:00:00.000Z
        Settings.now = () => 1609502400000;
        Settings.defaultLocale = "en-US";
        Settings.defaultZone = "UTC";
    });

    suiteTeardown(() => {
        Settings.now = originalNow;
        Settings.defaultLocale = originalDefaultLocale;
        Settings.defaultZone = originalDefaultZone;
    });

    // Helper to normalize non-breaking spaces in time format (common in some locales/environments)
    const normalize = (str: string) => str.replace(/\u202f/g, " ");

    test("should format full blame correctly", () => {
        const blame: Blame = {
            author: "John Doe",
            date: "2020-12-31T12:00:00.000Z", // 1 day ago
            revision: "123456",
            line: "10",
        };
        const log = "Commit message";

        const result = mapBlameToHoverMessage(blame, log);

        // Expected format:
        // $(account) John Doe
        // $(history) 1 day ago _(Dec 31, 2020, 12:00 PM)_
        // $(git-commit) 123456
        // joined by "  |  " (HTML entity: &nbsp;&nbsp;|&nbsp;&nbsp;)
        // then "\n\n"
        // then log

        const expectedAuthor = "$(account) John Doe";
        const expectedDate = "$(history) 1 day ago _(Dec 31, 2020, 12:00 PM)_";
        const expectedRevision = "$(git-commit) 123456";
        const separator = "&nbsp;&nbsp;|&nbsp;&nbsp;";

        const expectedHeader = [expectedAuthor, expectedDate, expectedRevision].join(separator);
        const expected = [expectedHeader, log].join("\n\n");

        assert.strictEqual(normalize(result), expected);
    });

    test("should format blame without log correctly", () => {
        const blame: Blame = {
            author: "Jane Doe",
            date: "2020-12-31T12:00:00.000Z",
            revision: "789012",
            line: "20",
        };

        const result = mapBlameToHoverMessage(blame);

        const expectedAuthor = "$(account) Jane Doe";
        const expectedDate = "$(history) 1 day ago _(Dec 31, 2020, 12:00 PM)_";
        const expectedRevision = "$(git-commit) 789012";
        const separator = "&nbsp;&nbsp;|&nbsp;&nbsp;";

        const expectedHeader = [expectedAuthor, expectedDate, expectedRevision].join(separator);
        // The implementation joins undefined log with "\n\n", effectively appending "\n\n" if log is undefined.
        const expected = expectedHeader + "\n\n";

        assert.strictEqual(normalize(result), expected);
    });

    test("should format blame with missing optional fields", () => {
        const blame: Blame = {
            line: "30",
            revision: "111111",
        };
        const log = "Partial info";

        const result = mapBlameToHoverMessage(blame, log);

        const expectedRevision = "$(git-commit) 111111";
        // Header only contains revision
        const expectedHeader = expectedRevision;
        const expected = [expectedHeader, log].join("\n\n");

        assert.strictEqual(result, expected);
    });

    test("should format blame with only date", () => {
        const blame = {
            line: "40",
            date: "2020-12-31T12:00:00.000Z",
        } as Blame;
        const log = "Date only";

        const result = mapBlameToHoverMessage(blame, log);

        const expectedDate = "$(history) 1 day ago _(Dec 31, 2020, 12:00 PM)_";
        const expectedHeader = expectedDate;
        const expected = [expectedHeader, log].join("\n\n");

        assert.strictEqual(normalize(result), expected);
    });

    test("should format blame with only author", () => {
        const blame = {
            line: "50",
            author: "Author Only",
        } as Blame;
        const log = "Author only";

        const result = mapBlameToHoverMessage(blame, log);

        const expectedAuthor = "$(account) Author Only";
        const expectedHeader = expectedAuthor;
        const expected = [expectedHeader, log].join("\n\n");

        assert.strictEqual(result, expected);
    });
});
