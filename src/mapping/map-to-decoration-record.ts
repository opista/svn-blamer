import { DecorationRecord } from "../types/decoration-record.model";

const defaultRecord: DecorationRecord = {
    icons: {},
    blamesByLine: {},
    blamesByRevision: {},
    revisionDecorations: {},
    logs: {},
    workingCopy: true,
};

export const mapToDecorationRecord = (record: Partial<DecorationRecord>): DecorationRecord => ({
    ...defaultRecord,
    ...record,
});
