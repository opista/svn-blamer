import merge from "lodash.merge";

import { DecorationRecord } from "../types/decoration-record.model";

const defaultRecord: DecorationRecord = {
    icons: {},
    blamesByLine: {},
    blamesByRevision: {},
    revisionDecorations: {},
    revisionsByDecoration: {},
    logs: {},
    workingCopy: true,
};

export const mapToDecorationRecord = (record: Partial<DecorationRecord>): DecorationRecord =>
    merge({}, defaultRecord, record);
