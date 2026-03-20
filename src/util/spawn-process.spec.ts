import * as assert from "node:assert";
import * as cp from "node:child_process";

import * as sinon from "sinon";

import * as spawnProcessModule from "./spawn-process";

suite("spawnProcess Utility Test Suite", () => {
    let sandbox: sinon.SinonSandbox;

    setup(() => {
        sandbox = sinon.createSandbox();
    });

    teardown(() => {
        sandbox.restore();
    });

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

    test("should reject with error when process explicitly emits 'error' event", async () => {
        const errorMsg = "Simulated error event via EventEmitter";
        const errorObj = new Error(errorMsg);

        const onStub = sandbox.stub(cp.ChildProcess.prototype, "on").callsFake(function (
            this: cp.ChildProcess,
            event,
            listener,
        ) {
            // Let the original method register the listener
            const result = onStub.wrappedMethod.apply(this, [event, listener]);

            // Once the "error" event is registered, we can manually emit it
            if (event === "error") {
                // We use process.nextTick to simulate an asynchronous error emission
                // after all listeners are registered.
                process.nextTick(() => {
                    this.emit("error", errorObj);
                });
            }
            return result;
        });

        const promise = spawnProcessModule.spawnProcess("node", [
            "-e",
            "setTimeout(() => {}, 1000)",
        ]);

        await assert.rejects(promise, (err: unknown) => {
            assert.strictEqual(err, errorObj);
            return true;
        });
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

    test("should reject when stdin is not writable", async () => {
        const promise = spawnProcessModule.spawnProcess(
            "node",
            ["-e", "setInterval(() => {}, 1000)"],
            { input: "input data", stdio: ["ignore", "pipe", "pipe"] as any },
        );

        await assert.rejects(promise, (err: unknown) => {
            assert.strictEqual(typeof err, "string", "The rejection value should be a string.");
            assert.match(
                err as string,
                /Cannot write input to child process: stdin is not writable/,
            );
            return true;
        });
    });

    test("should reject with stdin write errors emitted by the stream", async () => {
        const promise = spawnProcessModule.spawnProcess(
            "node",
            ["-e", "process.stdin.destroy(); setTimeout(() => {}, 200)"],
            { input: "x".repeat(1024 * 1024) },
        );

        await assert.rejects(promise, (err: unknown) => {
            assert.strictEqual(typeof err, "string", "The rejection value should be a string.");
            assert.match(err as string, /Failed to write input to stdin:/);
            return true;
        });
    });
});
