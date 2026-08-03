import * as assert from "assert";
import sinon from "sinon";
import {
    LogOutputChannel,
    StatusBarItem,
    TextEditor,
    TextEditorDecorationType,
    Uri,
    window,
    workspace,
} from "vscode";

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
            createGutterIconHashMap: sandbox.stub(),
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

    test("preserves indicator URI identity when updating a record", () => {
        const fileName = "/test/file.ts";
        const icon = Uri.parse("data:image/svg+xml;base64,aWNvbg==");
        const record = {
            icons: { "10": icon },
            blamesByLine: {},
            blamesByRevision: {},
            revisionDecorations: {},
            logs: { "10": "existing" },
            workingCopy: true,
        } as DecorationRecord;
        storageMock.get.withArgs(fileName).returns(record);

        blamer.updateRecordForFile(fileName, { logs: { "20": "new" } });

        const updated = storageMock.set.firstCall.args[1];
        assert.strictEqual(updated.icons["10"], icon);
        assert.deepStrictEqual(updated.logs, { "10": "existing", "20": "new" });
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
            document: {
                isDirty: false,
                lineCount: 10,
                uri: { fsPath: mockFileName, scheme: "vscode-remote" },
            },
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
            decorationManagerMock.createGutterIconHashMap.returns({});
            decorationManagerMock.createAndSetDecorationsForBlame.rejects(testError);

            await assert.rejects(
                blamer.showBlameForFile(mockTextEditor, mockFileName),
                (err) => {
                    assert.strictEqual(err, testError);
                    return true;
                },
                "showBlameForFile should propagate the error from decorationManager.createAndSetDecorationsForBlame",
            );
            assert.ok(
                decorationManagerMock.createGutterIconHashMap.calledOnceWithExactly(
                    mockFileName,
                    ["123"],
                    mockTextEditor.document.uri,
                ),
            );
        });

        test("refreshes icons when the colour scheme changes during initial blame", async () => {
            const fileName = "/test/race.ts";
            const textEditor = {
                document: {
                    fileName,
                    isDirty: false,
                    lineCount: 1,
                    uri: { fsPath: fileName, scheme: "file" },
                },
                visibleRanges: [{ start: { line: 0 }, end: { line: 0 } }],
            } as unknown as TextEditor;
            const records = new Map<string, DecorationRecord>();
            const oldIcon = Uri.parse("data:image/svg+xml;base64,b2xk");
            const newIcon = Uri.parse("data:image/svg+xml;base64,bmV3");
            const oldDecorationDispose = sandbox.spy();
            const oldDecoration = {
                dispose: oldDecorationDispose,
            } as unknown as TextEditorDecorationType;
            const newDecoration = { dispose: sandbox.spy() } as unknown as TextEditorDecorationType;
            const blame = [
                { revision: "10", author: "test", date: "2026-02-24T00:00:00.000Z", line: "1" },
            ];
            type DecorationResult = Awaited<
                ReturnType<DecorationManager["createAndSetDecorationsForBlame"]>
            >;
            let resolveInitialDecorations: (result: DecorationResult) => void;
            const initialDecorations = new Promise<DecorationResult>((resolve) => {
                resolveInitialDecorations = resolve;
            });

            storageMock.get.callsFake((key: string) => records.get(key));
            storageMock.set.callsFake((key: string, record: DecorationRecord) =>
                records.set(key, record),
            );
            sandbox.stub(blamer, "clearBlameForFile").resolves();
            svnMock.blameFile.resolves(blame);
            decorationManagerMock.createGutterIconHashMap.onFirstCall().returns({
                "10": oldIcon,
            });
            decorationManagerMock.createGutterIconHashMap.onSecondCall().returns({
                "10": newIcon,
            });
            decorationManagerMock.createAndSetDecorationsForBlame
                .onFirstCall()
                .returns(initialDecorations);
            decorationManagerMock.createAndSetDecorationsForBlame.onSecondCall().resolves({
                blamesByLine: { "1": blame[0] },
                blamesByRevision: { "10": blame },
                revisionDecorations: { "10": newDecoration },
            });
            sandbox.stub(window, "visibleTextEditors").value([]);

            const showBlame = blamer.showBlameForFile(textEditor, fileName);
            await new Promise((resolve) => setImmediate(resolve));
            await blamer.refreshVisibleBlameIndicators();
            resolveInitialDecorations!({
                blamesByLine: { "1": blame[0] },
                blamesByRevision: { "10": blame },
                revisionDecorations: { "10": oldDecoration },
            });
            await showBlame;

            assert.deepStrictEqual(records.get(fileName)?.icons, { "10": newIcon });
            assert.strictEqual(records.get(fileName)?.indicatorRefreshVersion, 1);
            assert.ok(oldDecorationDispose.calledOnce);
        });
    });

    suite("autoBlame", () => {
        test("refreshes a cached background tab after the indicator scheme changes", async () => {
            const fileName = "/test/background.ts";
            const textEditor = {
                document: {
                    fileName,
                    uri: { fsPath: fileName, scheme: "vscode-remote" },
                },
                visibleRanges: [{ start: { line: 0 }, end: { line: 1 } }],
            } as unknown as TextEditor;
            const oldIcon = Uri.parse("data:image/svg+xml;base64,b2xk");
            const newIcon = Uri.parse("data:image/svg+xml;base64,bmV3");
            const record: DecorationRecord = {
                workingCopy: true,
                indicatorRefreshVersion: 0,
                icons: { "10": oldIcon },
                blamesByLine: {
                    "1": { revision: "10", author: "one", date: "2026-02-24", line: "1" },
                },
                blamesByRevision: {
                    "10": [{ revision: "10", author: "one", date: "2026-02-24", line: "1" }],
                },
                revisionDecorations: {},
                logs: {},
            };
            const refreshedIcons = { "10": newIcon };
            const refreshedDecorations = { "10": {} as TextEditorDecorationType };

            sandbox.stub(workspace.fs, "stat").resolves();
            sandbox.stub(window, "visibleTextEditors").value([]);
            storageMock.get.withArgs(fileName).returns(record);
            decorationManagerMock.createGutterIconHashMap.returns(refreshedIcons);
            decorationManagerMock.createAndSetDecorationsForBlame.resolves({
                blamesByLine: record.blamesByLine,
                blamesByRevision: record.blamesByRevision,
                revisionDecorations: refreshedDecorations,
            });

            await blamer.refreshVisibleBlameIndicators();
            await blamer.autoBlame(textEditor);

            assert.ok(
                decorationManagerMock.createGutterIconHashMap.calledOnceWithExactly(
                    fileName,
                    ["10"],
                    textEditor.document.uri,
                ),
            );
            assert.ok(decorationManagerMock.reApplyDecorations.notCalled);
            assert.ok(
                storageMock.set.calledOnceWithExactly(
                    fileName,
                    sinon.match({
                        icons: refreshedIcons,
                        indicatorRefreshVersion: 1,
                    }),
                ),
            );
        });
    });

    suite("refreshVisibleBlameIndicators", () => {
        test("recreates cached blame decorations for every visible split without re-blaming", async () => {
            const fileName = "/test/file.ts";
            const oldDecorationDispose = sandbox.spy();
            const oldDecoration = {
                dispose: oldDecorationDispose,
            } as unknown as TextEditorDecorationType;
            const newDecoration = {
                dispose: sandbox.spy(),
            } as unknown as TextEditorDecorationType;
            const oldIcon10 = Uri.parse("data:image/svg+xml;base64,b2xkLTEw");
            const oldIcon20 = Uri.parse("data:image/svg+xml;base64,b2xkLTIw");
            const newIcon10 = Uri.parse("data:image/svg+xml;base64,bmV3LTEw");
            const newIcon20 = Uri.parse("data:image/svg+xml;base64,bmV3LTIw");
            const record: DecorationRecord = {
                workingCopy: true,
                icons: { "10": oldIcon10, "20": oldIcon20 },
                blamesByLine: {
                    "1": { revision: "10", author: "one", date: "2026-02-24", line: "1" },
                    "2": { revision: "20", author: "two", date: "2026-02-24", line: "2" },
                },
                blamesByRevision: {
                    "10": [{ revision: "10", author: "one", date: "2026-02-24", line: "1" }],
                    "20": [{ revision: "20", author: "two", date: "2026-02-24", line: "2" }],
                },
                revisionDecorations: { "10": oldDecoration, "20": oldDecoration },
                logs: {},
            };
            const firstEditor = {
                document: {
                    fileName,
                    lineCount: 10,
                    uri: { fsPath: fileName, scheme: "vscode-remote" },
                },
                visibleRanges: [{ start: { line: 0 }, end: { line: 4 } }],
            } as unknown as TextEditor;
            const secondEditor = {
                document: {
                    fileName,
                    lineCount: 10,
                    uri: { fsPath: fileName, scheme: "vscode-remote" },
                },
                visibleRanges: [{ start: { line: 5 }, end: { line: 9 } }],
            } as unknown as TextEditor;
            const newIcons = { "10": newIcon10, "20": newIcon20 };

            sandbox.stub(window, "visibleTextEditors").value([firstEditor, secondEditor]);
            sandbox.stub(workspace, "getConfiguration").returns({ viewportBuffer: 200 } as any);
            storageMock.get.withArgs(fileName).returns(record);
            decorationManagerMock.createGutterIconHashMap.returns(newIcons);
            decorationManagerMock.createAndSetDecorationsForBlame.resolves({
                blamesByLine: record.blamesByLine,
                blamesByRevision: record.blamesByRevision,
                revisionDecorations: { "10": newDecoration, "20": newDecoration },
            });

            await blamer.refreshVisibleBlameIndicators();

            assert.ok(
                decorationManagerMock.createGutterIconHashMap.calledOnceWithExactly(
                    fileName,
                    ["10", "20"],
                    firstEditor.document.uri,
                ),
            );
            assert.ok(
                decorationManagerMock.createAndSetDecorationsForBlame.calledOnceWithExactly(
                    firstEditor,
                    Object.values(record.blamesByLine),
                    newIcons,
                    record.logs,
                    sinon.match.array,
                ),
            );
            assert.ok(
                decorationManagerMock.reApplyDecorations.calledOnceWithExactly(
                    secondEditor,
                    sinon.match({ icons: newIcons }),
                    sinon.match.array,
                ),
            );
            assert.ok(
                oldDecorationDispose.calledOnce,
                "disposes old decorations after replacement",
            );
            assert.ok(
                storageMock.set.calledOnceWithExactly(fileName, sinon.match({ icons: newIcons })),
            );
            assert.ok(svnMock.blameFile.notCalled, "uses cached blame data");
        });
    });
});
