import merge from "lodash.merge";

import { DecorationRecord } from "../types/decoration-record.model";

const defaultRecord: DecorationRecord = {
    icons: {},
    blamesByLine: {},
    blamesByRevision: {},
    revisionDecorations: {},
    logs: {},
    workingCopy: true,
    indicatorRefreshVersion: 0,
};

export const mapToDecorationRecord = (record: Partial<DecorationRecord>): DecorationRecord =>
    merge({}, defaultRecord, record);
