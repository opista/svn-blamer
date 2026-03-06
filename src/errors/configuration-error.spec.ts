import * as assert from "assert";

import { ConfigurationError } from "./configuration-error";

suite("ConfigurationError Test Suite", () => {
    test("should correctly instantiate with message and name for primitive types", () => {
        const error = new ConfigurationError("someProperty", "someValue");

        assert.ok(error instanceof Error);
        assert.ok(error instanceof ConfigurationError);
        assert.strictEqual(
            error.message,
            `Setting: someProperty is not configured correctly. Value is "someValue"`,
        );
        assert.strictEqual(error.name, "ConfigurationError");
        assert.strictEqual(error.property, "someProperty");
        assert.strictEqual(error.value, "someValue");
    });

    test("should stringify object values in message", () => {
        const objValue = { key: "value", num: 42 };
        const error = new ConfigurationError("complexSetting", objValue);

        assert.strictEqual(
            error.message,
            `Setting: complexSetting is not configured correctly. Value is "{"key":"value","num":42}"`,
        );
        assert.strictEqual(error.value, objValue);
    });

    test("should correctly handle arrays (which are objects) by stringifying them", () => {
        const arrValue = [1, 2, "three"];
        const error = new ConfigurationError("arraySetting", arrValue);

        assert.strictEqual(
            error.message,
            `Setting: arraySetting is not configured correctly. Value is "[1,2,"three"]"`,
        );
        assert.strictEqual(error.value, arrValue);
    });

    test("should correctly handle numeric values", () => {
        const error = new ConfigurationError("port", 8080);

        assert.strictEqual(
            error.message,
            `Setting: port is not configured correctly. Value is "8080"`,
        );
        assert.strictEqual(error.value, 8080);
    });

    test("should correctly handle boolean values", () => {
        const error = new ConfigurationError("isEnabled", false);

        assert.strictEqual(
            error.message,
            `Setting: isEnabled is not configured correctly. Value is "false"`,
        );
        assert.strictEqual(error.value, false);
    });

    test("should correctly handle null values without throwing or trying to stringify", () => {
        const error = new ConfigurationError("nullableSetting", null);

        assert.strictEqual(
            error.message,
            `Setting: nullableSetting is not configured correctly. Value is "null"`,
        );
        assert.strictEqual(error.value, null);
    });

    test("should correctly handle undefined values", () => {
        const error = new ConfigurationError("missingSetting", undefined);

        assert.strictEqual(
            error.message,
            `Setting: missingSetting is not configured correctly. Value is "undefined"`,
        );
        assert.strictEqual(error.value, undefined);
    });
});
