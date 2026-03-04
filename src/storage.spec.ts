import * as assert from "assert";

import { Storage } from "./storage";

suite("Storage Test Suite", () => {
    let storage: Storage<string>;

    setup(() => {
        storage = new Storage<string>();
    });

    test("should return undefined for non-existent key", () => {
        assert.strictEqual(storage.get("non-existent"), undefined);
    });

    test("should set and get a value", () => {
        storage.set("key", "value");
        assert.strictEqual(storage.get("key"), "value");
    });

    test("should overwrite an existing value", () => {
        storage.set("key", "value1");
        storage.set("key", "value2");
        assert.strictEqual(storage.get("key"), "value2");
    });

    test("should delete a value", () => {
        storage.set("key", "value");
        storage.delete("key");
        assert.strictEqual(storage.get("key"), undefined);
    });

    test("should not throw when deleting non-existent key", () => {
        storage.delete("non-existent");
        assert.strictEqual(storage.get("non-existent"), undefined);
    });

    test("should clear all values", () => {
        storage.set("key1", "value1");
        storage.set("key2", "value2");
        storage.clear();
        assert.strictEqual(storage.get("key1"), undefined);
        assert.strictEqual(storage.get("key2"), undefined);
    });

    test("should not throw when clearing empty storage", () => {
        storage.clear();
        assert.strictEqual(storage.get("any"), undefined);
    });
});
