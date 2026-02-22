"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function checkError(err) {
    if (typeof err === "object" && err !== null && "message" in err) {
        if (typeof err.message === "string") {
            const s = err.message;
        }
    }
}
//# sourceMappingURL=test_narrowing.js.map