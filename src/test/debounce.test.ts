import * as FakeTimers from "@sinonjs/fake-timers";
import * as assert from "assert";

import { debounce } from "../util/debounce";

suite("Debounce Utility Test Suite", () => {
    let clock: FakeTimers.InstalledClock;

    setup(() => {
        clock = FakeTimers.install();
    });

    teardown(() => {
        clock.uninstall();
    });

    test("should execute function after delay", () => {
        let called = false;
        const fn = debounce(() => {
            called = true;
        }, 50);

        fn();
        assert.strictEqual(called, false);

        clock.tick(50);
        assert.strictEqual(called, true);
    });

    test("should not execute function immediately", () => {
        let called = false;
        const fn = debounce(() => {
            called = true;
        }, 50);

        fn();
        assert.strictEqual(called, false);

        clock.tick(10);
        assert.strictEqual(called, false);
    });

    test("should execute only once if called multiple times within delay", () => {
        let callCount = 0;
        const fn = debounce(() => {
            callCount++;
        }, 50);

        fn();
        clock.tick(10);
        fn();
        clock.tick(10);
        fn();

        assert.strictEqual(callCount, 0);

        clock.tick(50);
        assert.strictEqual(callCount, 1);
    });

    test("should pass arguments correctly", () => {
        let lastArgs: [number, string, boolean] | undefined;
        const fn = debounce((a: number, b: string, c: boolean) => {
            lastArgs = [a, b, c];
        }, 50);

        fn(1, "test", true);
        clock.tick(50);

        assert.deepStrictEqual(lastArgs, [1, "test", true]);
    });

    test("should preserve context", () => {
        class TestClass {
            public value = 42;
        }

        let capturedThis: TestClass | undefined;
        const fn = debounce(function (this: TestClass) {
            capturedThis = this;
        }, 50);

        const context = new TestClass();
        context.value = 123;
        fn.call(context);

        clock.tick(50);
        assert.strictEqual(capturedThis, context);
        assert.strictEqual(capturedThis.value, 123);
    });
});
