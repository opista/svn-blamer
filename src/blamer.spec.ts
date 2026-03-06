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
});
