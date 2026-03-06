import * as assert from "assert";

import { NotWorkingCopyError } from "./not-working-copy-error";

suite("NotWorkingCopyError Test Suite", () => {
    test("should set the correct error message", () => {
        const fileName = "test.txt";
        const error = new NotWorkingCopyError(fileName);
        assert.strictEqual(error.message, "File is not a working copy");
    });

    test("should set the fileName property", () => {
        const fileName = "test.txt";
        const error = new NotWorkingCopyError(fileName);
        assert.strictEqual(error.fileName, fileName);
    });

    test("should be an instance of Error and NotWorkingCopyError", () => {
        const error = new NotWorkingCopyError("test.txt");
        assert.ok(error instanceof Error);
        assert.ok(error instanceof NotWorkingCopyError);
    });
});
