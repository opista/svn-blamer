import * as assert from "assert";

import { NotWorkingCopyError } from "./not-working-copy-error";

suite("NotWorkingCopyError Test Suite", () => {
    const fileName = "test.txt";

    test("should correctly initialize properties", () => {
        const error = new NotWorkingCopyError(fileName);
        assert.strictEqual(error.message, "File is not a working copy");
        assert.strictEqual(error.fileName, fileName);
    });

    test("should be an instance of Error and NotWorkingCopyError", () => {
        const error = new NotWorkingCopyError(fileName);
        assert.ok(error instanceof Error);
        assert.ok(error instanceof NotWorkingCopyError);
    });
});
