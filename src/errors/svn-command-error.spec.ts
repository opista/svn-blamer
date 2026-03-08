import * as assert from "assert";

import { SvnCommandError } from "./svn-command-error";

suite("SvnCommandError Test Suite", () => {
    test("should correctly instantiate with message and name", () => {
        const message = "SVN command failed";
        const error = new SvnCommandError(message);

        assert.ok(error instanceof Error);
        assert.ok(error instanceof SvnCommandError);
        assert.strictEqual(error.message, message);
        assert.strictEqual(error.name, "SvnCommandError");
    });
});
