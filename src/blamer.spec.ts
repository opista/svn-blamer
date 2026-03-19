import * as assert from "assert";
import sinon from "sinon";
import { LogOutputChannel, StatusBarItem, TextEditor, window } from "vscode";

import { Blamer } from "./blamer";
import { DecorationManager } from "./decoration-manager";
import { Storage } from "./storage";
import { SVN } from "./svn";
import { DummyLogOutputChannel } from "./test/mock-vscode";
import { DecorationRecord } from "./types/decoration-record.model";

suite("Blamer", () => {
    let blamer: Blamer;
    let loggerMock: sinon.SinonStubbedInstance<LogOutputChannel>;
    let storageMock: sinon.SinonStubbedInstance<Storage<DecorationRecord>>;
    let svnMock: sinon.SinonStubbedInstance<SVN>;
    let decorationManagerMock: sinon.SinonStubbedInstance<DecorationManager>;
    const sandbox = sinon.createSandbox();

    setup(() => {
        loggerMock = sandbox.createStubInstance(
            DummyLogOutputChannel,
        ) as unknown as sinon.SinonStubbedInstance<LogOutputChannel>;

        storageMock = {
            get: sandbox.stub(),
            set: sandbox.stub(),
            delete: sandbox.stub(),
            clear: sandbox.stub(),
        } as unknown as sinon.SinonStubbedInstance<Storage<DecorationRecord>>;

        svnMock = {
            blameFile: sandbox.stub(),
            getLogForRevision: sandbox.stub(),
        } as unknown as sinon.SinonStubbedInstance<SVN>;

        decorationManagerMock = {
            createGutterImagePathHashMap: sandbox.stub(),
            createAndSetDecorationsForBlame: sandbox.stub(),
            reApplyDecorations: sandbox.stub(),
            updateRevisionHoverMessages: sandbox.stub(),
            setActiveLineDecoration: sandbox.stub(),
        } as unknown as sinon.SinonStubbedInstance<DecorationManager>;

        sandbox.stub(window, "createStatusBarItem").returns({
            text: "",
            show: sandbox.stub(),
            hide: sandbox.stub(),
            dispose: sandbox.stub(),
        } as unknown as StatusBarItem);

        blamer = new Blamer(
            loggerMock,
            storageMock as any,
            svnMock as any,
            decorationManagerMock as any,
        );
    });

    teardown(() => {
        sandbox.restore();
    });

    suite("toggleBlameForFile", () => {
        const fileName = "/test/file.ts";
        const mockTextEditor = {} as TextEditor;
        let clearBlameForFileStub: sinon.SinonStub;
        let showBlameForFileStub: sinon.SinonStub;
        let handleErrorStub: sinon.SinonStub;

        setup(() => {
            clearBlameForFileStub = sandbox.stub(blamer, "clearBlameForFile");
            showBlameForFileStub = sandbox.stub(blamer, "showBlameForFile");
            handleErrorStub = sandbox.stub(blamer as any, "handleError");
        });

        test("should clear blame if file data exists", async () => {
            const record = { workingCopy: true } as DecorationRecord;
            sandbox.stub(blamer, "getRecordForFile").returns(record);

            await blamer.toggleBlameForFile(mockTextEditor, fileName);

            assert.ok(clearBlameForFileStub.calledOnceWithExactly(fileName));
            assert.ok(showBlameForFileStub.notCalled);
        });

        test("should show blame if file data does not exist", async () => {
            sandbox.stub(blamer, "getRecordForFile").returns(undefined);

            await blamer.toggleBlameForFile(mockTextEditor, fileName);

            assert.ok(showBlameForFileStub.calledOnceWithExactly(mockTextEditor, fileName));
            assert.ok(clearBlameForFileStub.notCalled);
        });

        test("should handle error during clear blame", async () => {
            const record = { workingCopy: true } as DecorationRecord;
            sandbox.stub(blamer, "getRecordForFile").returns(record);
            const expectedError = new Error("Clear failed");
            clearBlameForFileStub.rejects(expectedError);

            await blamer.toggleBlameForFile(mockTextEditor, fileName);

            assert.ok(
                handleErrorStub.calledOnceWithExactly(expectedError, "Toggle blame failed [hide]"),
            );
        });

        test("should handle error during show blame", async () => {
            sandbox.stub(blamer, "getRecordForFile").returns(undefined);
            const expectedError = new Error("Show failed");
            showBlameForFileStub.rejects(expectedError);

            await blamer.toggleBlameForFile(mockTextEditor, fileName);

            assert.ok(
                handleErrorStub.calledOnceWithExactly(expectedError, "Toggle blame failed [show]"),
            );
        });
    });

    suite("setUpdatedDecoration", () => {
        test("should call updateRevisionHoverMessages when log already exists", async () => {
            const fileName = "/test/file.ts";
            const line = "5";
            const revision = "12345";
            const mockTextEditor = {} as TextEditor;

            const record: DecorationRecord = {
                workingCopy: true,
                icons: {},
                blamesByLine: {
                    [line]: { revision, author: "test", date: "2026-02-24T00:00:00.000Z", line },
                },
                blamesByRevision: {
                    [revision]: [
                        { revision, author: "test", date: "2026-02-24T00:00:00.000Z", line },
                    ],
                },
                revisionDecorations: {},
                logs: {
                    [revision]: "existing log message",
                },
            };

            sandbox.stub(blamer, "getRecordForFile").returns(record);
            sandbox.stub(blamer, "fetchLogAndUpdateDecoration");

            await blamer.setUpdatedDecoration(mockTextEditor, fileName, line);

            assert.ok(
                decorationManagerMock.setActiveLineDecoration.calledOnce,
                "setActiveLineDecoration should be called",
            );

            // fetchLogAndUpdateDecoration should NOT be called since log exists
            assert.ok(
                (blamer.fetchLogAndUpdateDecoration as sinon.SinonStub).notCalled,
                "fetchLogAndUpdateDecoration should not be called",
            );

            // The critical fix: updateRevisionHoverMessages MUST be called
            assert.ok(
                decorationManagerMock.updateRevisionHoverMessages.calledOnceWithExactly(
                    mockTextEditor,
                    record,
                    revision,
                ),
                "updateRevisionHoverMessages should be called to fix rendering order",
            );
        });

        test("should call fetchLogAndUpdateDecoration when log does not exist", async () => {
            const fileName = "/test/file.ts";
            const line = "5";
            const revision = "12345";
            const mockTextEditor = {} as TextEditor;

            const record: DecorationRecord = {
                workingCopy: true,
                icons: {},
                blamesByLine: {
                    [line]: { revision, author: "test", date: "2026-02-24T00:00:00.000Z", line },
                },
                blamesByRevision: {
                    [revision]: [
                        { revision, author: "test", date: "2026-02-24T00:00:00.000Z", line },
                    ],
                },
                revisionDecorations: {},
                logs: {}, // Empty logs
            };

            sandbox.stub(blamer, "getRecordForFile").returns(record);
            sandbox.stub(blamer, "fetchLogAndUpdateDecoration");

            await blamer.setUpdatedDecoration(mockTextEditor, fileName, line);

            assert.ok(
                decorationManagerMock.setActiveLineDecoration.calledOnce,
                "setActiveLineDecoration should be called",
            );

            // fetchLogAndUpdateDecoration SHOULD be called
            assert.ok(
                (blamer.fetchLogAndUpdateDecoration as sinon.SinonStub).calledOnce,
                "fetchLogAndUpdateDecoration should be called",
            );

            // updateRevisionHoverMessages should NOT be called here
            assert.ok(
                decorationManagerMock.updateRevisionHoverMessages.notCalled,
                "updateRevisionHoverMessages should not be called",
            );
        });
    });

    suite("showBlameForActiveTextEditor", () => {
        test("should call handleError when showBlameForFile throws an error", async () => {
            const mockTextEditor = {} as TextEditor;
            const mockFileName = "/test/error-file.ts";
            const testError = new Error("Test Error");

            sandbox.stub(blamer, "getActiveTextEditorAndFileName").resolves({
                textEditor: mockTextEditor,
                fileName: mockFileName,
            });

            sandbox.stub(blamer, "showBlameForFile").rejects(testError);

            const handleErrorSpy = sandbox.spy(
                blamer as unknown as { handleError: Function },
                "handleError",
            );

            await blamer.showBlameForActiveTextEditor();

            assert.ok(handleErrorSpy.calledOnce, "handleError should be called once");
            assert.strictEqual(handleErrorSpy.firstCall.args[0], testError);
            assert.strictEqual(handleErrorSpy.firstCall.args[1], "Blame action failed");
        });
    });

    suite("showBlameForFile", () => {
        const mockFileName = "/test/error-file.ts";
        const mockTextEditor = {
            document: { isDirty: false, lineCount: 10 },
            visibleRanges: [{ start: { line: 0 }, end: { line: 10 } }],
        } as unknown as TextEditor;

        test("should throw an error if svn.blameFile fails", async () => {
            const testError = new Error("Blame Retrieval Failed");

            sandbox.stub(blamer, "clearBlameForFile").resolves();
            svnMock.blameFile.rejects(testError);

            await assert.rejects(
                blamer.showBlameForFile(mockTextEditor, mockFileName),
                (err) => {
                    assert.strictEqual(err, testError);
                    return true;
                },
                "showBlameForFile should propagate the error from svn.blameFile",
            );
        });

        test("should throw an error if decorationManager.createAndSetDecorationsForBlame fails", async () => {
            const testError = new Error("Decoration Creation Failed");

            const blameData = [
                { revision: "123", author: "test", date: "2026-02-24T00:00:00.000Z", line: "1" },
            ];

            sandbox.stub(blamer, "clearBlameForFile").resolves();
            svnMock.blameFile.resolves(blameData);
            decorationManagerMock.createGutterImagePathHashMap.resolves({});
            decorationManagerMock.createAndSetDecorationsForBlame.rejects(testError);

            await assert.rejects(
                blamer.showBlameForFile(mockTextEditor, mockFileName),
                (err) => {
                    assert.strictEqual(err, testError);
                    return true;
                },
                "showBlameForFile should propagate the error from decorationManager.createAndSetDecorationsForBlame",
            );
        });
    });
});
