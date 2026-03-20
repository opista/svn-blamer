import * as assert from "node:assert";
import * as spawnProcessModule from "./src/util/spawn-process";
import * as cp from "node:child_process";
import * as sinon from "sinon";

const sandbox = sinon.createSandbox();

const mockChild = new (require("events").EventEmitter)() as cp.ChildProcess;
mockChild.stdout = new (require("stream").Readable)({ read() { this.push(null); } });
mockChild.stderr = new (require("stream").Readable)({ read() { this.push(null); } });

try {
  // Try proxyquire or similar if possible. But sinon doesn't allow it.
  // We can't stub `cp.spawn` but what about `spawnProcessModule.spawn`? Wait, spawnProcess imports spawn directly.
  console.log("Since 'node:child_process' is an ESM module/built-in, 'spawn' is non-configurable.");
} catch(e) {
  console.log("Error:", e);
}
