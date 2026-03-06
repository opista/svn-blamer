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
        const disposeStub1 = sinon.stub();
        const disposeStub2 = sinon.stub();
        const disposeStub3 = sinon.stub();

        const decorations = [
            { dispose: disposeStub1 } as unknown as TextEditorDecorationType,
            { dispose: disposeStub2 } as unknown as TextEditorDecorationType,
            { dispose: disposeStub3 } as unknown as TextEditorDecorationType,
        ];

        disposeDecorations(decorations);

        assert.strictEqual(disposeStub1.calledOnce, true);
        assert.strictEqual(disposeStub2.calledOnce, true);
        assert.strictEqual(disposeStub3.calledOnce, true);
    });
});
