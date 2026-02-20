import * as assert from "assert";

import { Storage } from "../storage";

suite("Storage Test Suite", () => {
    test("should return undefined for non-existent key", () => {
        const storage = new Storage<string>();
        assert.strictEqual(storage.get("non-existent"), undefined);
    });

    test("should set and get a value", () => {
        const storage = new Storage<string>();
        storage.set("key", "value");
        assert.strictEqual(storage.get("key"), "value");
    });

    test("should overwrite an existing value", () => {
        const storage = new Storage<string>();
        storage.set("key", "value1");
        storage.set("key", "value2");
        assert.strictEqual(storage.get("key"), "value2");
    });

    test("should delete a value", () => {
        const storage = new Storage<string>();
        storage.set("key", "value");
        storage.delete("key");
        assert.strictEqual(storage.get("key"), undefined);
    });

    test("should clear all values", () => {
        const storage = new Storage<string>();
        storage.set("key1", "value1");
        storage.set("key2", "value2");
        storage.clear();
        assert.strictEqual(storage.get("key1"), undefined);
        assert.strictEqual(storage.get("key2"), undefined);
    });
});
