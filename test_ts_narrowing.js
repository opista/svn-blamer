"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function test(err) {
    if (typeof err === "object" && err !== null && "message" in err) {
        if (typeof err.message === "string") { // This line might fail
            const s = err.message;
        }
    }
}
//# sourceMappingURL=test_ts_narrowing.js.map