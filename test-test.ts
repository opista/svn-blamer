import * as assert from "node:assert";
import * as sinon from "sinon";
import * as cp from "node:child_process";

const sandbox = sinon.createSandbox();

const mockChild = new (require("events").EventEmitter)() as cp.ChildProcess;

try {
  sandbox.stub(cp, "spawn").returns(mockChild);
  console.log("Success stubbing cp.spawn");
} catch(e) {
  console.log("Error stubbing cp.spawn:", e);
}
sandbox.restore();
