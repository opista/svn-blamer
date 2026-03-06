import * as assert from "assert";

import * as spawnProcessModule from "./spawn-process";

suite("spawnProcess Utility Test Suite", () => {
    test("should resolve with stdout when process exits with code 0", async () => {
        const promise = spawnProcessModule.spawnProcess("node", [
            "-e",
            "process.stdout.write('hello world')",
        ]);
        const result = await promise;
        assert.strictEqual(result.trim(), "hello world");
    });

    test("should reject with stderr when process exits with non-zero code", async () => {
        const promise = spawnProcessModule.spawnProcess("node", [
            "-e",
            "process.stderr.write('some error'); process.exit(1)",
        ]);
        await assert.rejects(promise, (err: unknown) => {
            assert.strictEqual(typeof err, "string", "The rejection value should be a string.");
            assert.strictEqual((err as string).trim(), "some error");
            return true;
        });
    });

    test("should reject with error when process emits error", async () => {
        const promise = spawnProcessModule.spawnProcess(
            "some-non-existent-command-that-will-fail",
            [],
        );
        await assert.rejects(promise, { code: "ENOENT" });
    });
});
