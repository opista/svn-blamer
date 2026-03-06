import * as assert from "assert";
import * as sinon from "sinon";
import { TextEditorDecorationType } from "vscode";

import { disposeDecorations } from "./dispose-decorations";

suite("Dispose Decorations Test Suite", () => {
    test("should handle an empty array without throwing errors", () => {
        const decorations: TextEditorDecorationType[] = [];
        assert.doesNotThrow(() => {
            disposeDecorations(decorations);
        });
    });

    test("should call dispose on a single decoration", () => {
        const disposeStub = sinon.stub();
        const decoration = { dispose: disposeStub } as unknown as TextEditorDecorationType;

        disposeDecorations([decoration]);

        assert.strictEqual(disposeStub.calledOnce, true);
    });

    test("should call dispose on multiple decorations", () => {
        const stubs = [sinon.stub(), sinon.stub(), sinon.stub()];
        const decorations = stubs.map(
            (stub) => ({ dispose: stub }) as unknown as TextEditorDecorationType,
        );

        disposeDecorations(decorations);

        stubs.forEach((stub) => assert.strictEqual(stub.calledOnce, true));
    });
});
