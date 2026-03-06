import * as assert from "assert";

import { AuthenticationError } from "./authentication-error";

suite("AuthenticationError Test Suite", () => {
    test("should correctly instantiate with message and name", () => {
        const fileName = "test-file.txt";
        const error = new AuthenticationError(fileName);

        assert.ok(error instanceof Error);
        assert.ok(error instanceof AuthenticationError);
        assert.strictEqual(error.message, `Authentication failed for file: ${fileName}`);
        assert.strictEqual(error.name, "AuthenticationError");
        assert.strictEqual(error.fileName, fileName);
    });
});
