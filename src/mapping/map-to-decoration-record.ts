import merge from "lodash.merge";

import { DecorationRecord } from "../types/decoration-record.model";

const defaultRecord: DecorationRecord = {
    icons: {},
    lines: {},
    logs: {},
    workingCopy: true,
};

export const mapToDecorationRecord = (record: Partial<DecorationRecord>): DecorationRecord =>
    merge(defaultRecord, record);
