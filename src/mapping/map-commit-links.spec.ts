import * as assert from "assert";

import { CommitLink } from "../types/commit-link.model";
import { mapCommitLinks } from "./map-commit-links";

suite("Map Commit Links Test Suite", () => {
    const serviceNow: CommitLink = {
        pattern: "\\b(?:CHG|CR|INC|RITM)\\d{4,}\\b",
        url: "https://example.service-now.com/nav_to.do?uri=change_request.do?sysparm_query=number=$0",
    };

    test("returns an empty array when no rules are configured", () => {
        assert.deepStrictEqual(mapCommitLinks("Fixed CHG1234567", []), []);
    });

    test("returns an empty array when there is no match", () => {
        assert.deepStrictEqual(mapCommitLinks("No ticket here", [serviceNow]), []);
    });

    test("builds a clickable link with the default icon and label", () => {
        const result = mapCommitLinks("Implements CHG1234567 for billing", [serviceNow]);

        assert.deepStrictEqual(result, [
            "[$(link) CHG1234567](https://example.service-now.com/nav_to.do?uri=change_request.do?sysparm_query=number=CHG1234567)",
        ]);
    });

    test("matches case-insensitively by default", () => {
        const result = mapCommitLinks("see chg1234567", [serviceNow]);

        assert.strictEqual(result.length, 1);
        assert.ok(result[0].includes("chg1234567"));
    });

    test("supports capture groups in url and title", () => {
        const rule: CommitLink = {
            pattern: "#(\\d+)",
            title: "GH-$1",
            url: "https://github.com/owner/repo/issues/$1",
        };

        const result = mapCommitLinks("Closes #42", [rule]);

        assert.deepStrictEqual(result, [
            "[$(link) GH-42](https://github.com/owner/repo/issues/42)",
        ]);
    });

    test("supports a custom icon", () => {
        const rule: CommitLink = { ...serviceNow, icon: "issues" };

        const result = mapCommitLinks("CHG1234567", [rule]);

        assert.ok(result[0].startsWith("[$(issues) "));
    });

    test("omits the icon when set to an empty string", () => {
        const rule: CommitLink = { ...serviceNow, icon: "" };

        const result = mapCommitLinks("CHG1234567", [rule]);

        assert.ok(result[0].startsWith("[CHG1234567]"));
    });

    test("de-duplicates repeated references", () => {
        const result = mapCommitLinks("CHG1234567 and again CHG1234567", [serviceNow]);

        assert.strictEqual(result.length, 1);
    });

    test("returns one link per distinct match", () => {
        const result = mapCommitLinks("CHG1234567 then INC0009999", [serviceNow]);

        assert.strictEqual(result.length, 2);
    });

    test("applies multiple rules", () => {
        const jira: CommitLink = { pattern: "\\b[A-Z]{2,}-\\d+\\b", url: "https://jira/$0" };

        const result = mapCommitLinks("CHG1234567 and PROJ-7", [serviceNow, jira]);

        assert.strictEqual(result.length, 2);
    });

    test("skips rules missing a pattern or url", () => {
        const result = mapCommitLinks("CHG1234567", [
            { pattern: "", url: "https://x/$0" } as CommitLink,
            { pattern: "CHG\\d+", url: "" } as CommitLink,
        ]);

        assert.deepStrictEqual(result, []);
    });

    test("skips malformed patterns without throwing", () => {
        const bad: CommitLink = { pattern: "(unclosed", url: "https://x/$0" };

        assert.doesNotThrow(() => mapCommitLinks("CHG1234567", [bad]));
        assert.deepStrictEqual(mapCommitLinks("CHG1234567", [bad]), []);
    });

    test("matches all occurrences globally", () => {
        const rule: CommitLink = { pattern: "chg\\d+", url: "https://x/$0" };

        assert.strictEqual(mapCommitLinks("chg1 chg2 chg3", [rule]).length, 3);
    });

    test("skips links with unsafe protocols (e.g. command:)", () => {
        const rule: CommitLink = { pattern: "chg\\d+", url: "command:unsafe?args=$0" };

        assert.deepStrictEqual(mapCommitLinks("chg1", [rule]), []);
    });

    test("allows http and https urls", () => {
        const http: CommitLink = { pattern: "CHG\\d+", url: "http://x/$0" };
        const https: CommitLink = { pattern: "CHG\\d+", url: "https://x/$0" };

        assert.strictEqual(mapCommitLinks("CHG1234567", [http]).length, 1);
        assert.strictEqual(mapCommitLinks("CHG1234567", [https]).length, 1);
    });

    test("rejects non-http(s) url schemes", () => {
        const schemes = [
            "command:workbench.action.terminal.new",
            "file:///etc/passwd",
            "javascript:alert(1)",
            "vscode://settings",
            "//evil.example.com/$0",
        ];

        for (const url of schemes) {
            const rule: CommitLink = { pattern: "CHG\\d+", url };
            assert.deepStrictEqual(
                mapCommitLinks("CHG1234567", [rule]),
                [],
                `expected scheme to be rejected: ${url}`,
            );
        }
    });

    test("rejects a url whose scheme comes from a capture group", () => {
        const rule: CommitLink = { pattern: "(command):(\\w+)", url: "$1:$2" };

        assert.deepStrictEqual(mapCommitLinks("run command:evil", [rule]), []);
    });
});
