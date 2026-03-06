import * as assert from "assert";
import * as sinon from "sinon";
import { TextEditor, workspace } from "vscode";

import { getFileNameFromTextEditor } from "./get-file-name-from-text-editor";

suite("Get File Name From Text Editor Test Suite", () => {
    let sandbox: sinon.SinonSandbox;
    let statStub: sinon.SinonStub;

    setup(() => {
        sandbox = sinon.createSandbox();
        statStub = sandbox.stub(workspace.fs, "stat");
    });

    teardown(() => {
        sandbox.restore();
    });

    test("should return undefined if textEditor is undefined", async () => {
        const result = await getFileNameFromTextEditor(undefined);
        assert.strictEqual(result, undefined);
    });

    test("should return undefined if document is undefined", async () => {
        const result = await getFileNameFromTextEditor({} as TextEditor);
        assert.strictEqual(result, undefined);
    });

    test("should return undefined if fileName is missing", async () => {
        const mockEditor = {
            document: {
                isUntitled: false,
                uri: { fsPath: "/mock/path" },
            },
        } as unknown as TextEditor;

        const result = await getFileNameFromTextEditor(mockEditor);
        assert.strictEqual(result, undefined);
    });

    test("should return undefined if document is untitled", async () => {
        const mockEditor = {
            document: {
                fileName: "Untitled-1",
                isUntitled: true,
                uri: { fsPath: "/mock/path" },
            },
        } as unknown as TextEditor;

        const result = await getFileNameFromTextEditor(mockEditor);
        assert.strictEqual(result, undefined);
    });

    test("should return undefined if uri is missing", async () => {
        const mockEditor = {
            document: {
                fileName: "/mock/path/file.ts",
                isUntitled: false,
            },
        } as unknown as TextEditor;

        const result = await getFileNameFromTextEditor(mockEditor);
        assert.strictEqual(result, undefined);
    });

    suite("with a valid TextEditor object", () => {
        const mockEditor = {
            document: {
                fileName: "/mock/path/file.ts",
                isUntitled: false,
                uri: { fsPath: "/mock/path/file.ts" },
            },
        } as unknown as TextEditor;

        test("should return undefined if workspace.fs.stat throws an error", async () => {
            statStub.rejects(new Error("File not found"));

            const result = await getFileNameFromTextEditor(mockEditor);
            assert.strictEqual(result, undefined);
            assert.strictEqual(statStub.calledOnce, true);
            assert.strictEqual(statStub.firstCall.args[0], mockEditor.document.uri);
        });

        test("should return fileName if workspace.fs.stat succeeds", async () => {
            statStub.resolves({ type: 1, ctime: 0, mtime: 0, size: 0 });

            const result = await getFileNameFromTextEditor(mockEditor);
            assert.strictEqual(result, "/mock/path/file.ts");
            assert.strictEqual(statStub.calledOnce, true);
            assert.strictEqual(statStub.firstCall.args[0], mockEditor.document.uri);
        });
    });
});
