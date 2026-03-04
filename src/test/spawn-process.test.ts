
import * as assert from "assert";

import * as spawnProcessModule from "../util/spawn-process";

suite("spawnProcess Utility Test Suite", () => {
    test("should resolve with stdout when process exits with code 0", async () => {
        // Here we test actual spawn behavior for simple commands since stubbing `node:child_process`
        // requires rewriting how `spawn` is imported in `spawn-process.ts`.
        // We will execute standard cross-platform echo and see if it captures stdout.
        const promise = spawnProcessModule.spawnProcess("node", ["-e", "console.log('hello world')"]);
        const result = await promise;
        assert.strictEqual(result.trim(), "hello world");
    });

    test("should reject with stderr when process exits with non-zero code", async () => {
        const promise = spawnProcessModule.spawnProcess("node", ["-e", "console.error('some error'); process.exit(1)"]);
        try {
            await promise;
            assert.fail("Should have rejected");
        } catch (err) {
            assert.strictEqual(typeof err === "string" && err.includes("some error"), true);
        }
    });

    test("should reject with error when process emits error", async () => {
        const promise = spawnProcessModule.spawnProcess("some-non-existent-command-that-will-fail", []);
        try {
            await promise;
            assert.fail("Should have rejected");
        } catch (err: any) {
            assert.strictEqual(err.code, "ENOENT");
        }
    });
});
