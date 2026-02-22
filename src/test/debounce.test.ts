import * as assert from "assert";

import { debounce } from "../util/debounce";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

suite("Debounce Utility Test Suite", () => {
    test("should execute function after delay", async () => {
        let called = false;
        const fn = debounce(() => {
            called = true;
        }, 50);

        fn();
        assert.strictEqual(called, false);
        await sleep(60);
        assert.strictEqual(called, true);
    });

    test("should not execute function immediately", async () => {
        let called = false;
        const fn = debounce(() => {
            called = true;
        }, 50);

        fn();
        assert.strictEqual(called, false);
        await sleep(10);
        assert.strictEqual(called, false);
    });

    test("should execute only once if called multiple times within delay", async () => {
        let callCount = 0;
        const fn = debounce(() => {
            callCount++;
        }, 50);

        fn();
        await sleep(10);
        fn();
        await sleep(10);
        fn();

        assert.strictEqual(callCount, 0);

        await sleep(60);
        assert.strictEqual(callCount, 1);
    });

    test("should pass arguments correctly", async () => {
        let lastArgs: any[] = [];
        const fn = debounce((...args: any[]) => {
            lastArgs = args;
        }, 50);

        fn(1, "test", true);
        await sleep(60);

        assert.deepStrictEqual(lastArgs, [1, "test", true]);
    });

    test("should preserve context", async () => {
        class TestClass {
            public value = 42;
            public method = debounce(function (this: TestClass) {
                return this.value;
            }, 50);
        }

        const instance = new TestClass();
        // Since debounce returns void (implied), we can't easily check return value directly here without wrapping
        // The implementation says: return function (this: any, ...args: any[]) { ... } as F;
        // But the return type F is inferred as void-returning usually.
        // Let's modify the test to capture 'this'.

        let capturedThis: any;
        const fn = debounce(function (this: any) {
            capturedThis = this;
        }, 50);

        const context = { value: 123 };
        fn.call(context);

        await sleep(60);
        assert.strictEqual(capturedThis, context);
        assert.strictEqual(capturedThis.value, 123);
    });
});
