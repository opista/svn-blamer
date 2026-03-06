import * as assert from "assert";

import * as spawnProcessModule from "./spawn-process";

suite("spawnProcess Utility Test Suite", () => {
    test("should resolve with stdout when process exits with code 0", async () => {
        const promise = spawnProcessModule.spawnProcess("node", [
            "-e",
            "console.log('hello world')",
        ]);
        const result = await promise;
        assert.strictEqual(result.trim(), "hello world");
    });

    test("should reject with stderr when process exits with non-zero code", async () => {
        const promise = spawnProcessModule.spawnProcess("node", [
            "-e",
            "console.error('some error'); process.exit(1)",
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

    test("should write input to stdin if provided", async () => {
        const inputData = "this is some input data";
        // Cross-platform equivalent of `cat` using Node.js
        const promise = spawnProcessModule.spawnProcess(
            "node",
            ["-e", "process.stdin.pipe(process.stdout)"],
            { input: inputData },
        );
        const result = await promise;
        assert.strictEqual(result, inputData);
    });
});
