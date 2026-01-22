import merge from "lodash.merge";

import { Blame } from "../types/blame.model";
import { BlamesByLine, BlamesByRevision, DecorationRecord } from "../types/decoration-record.model";

const defaultRecord: DecorationRecord = {
    icons: {},
    blames: [],
    blamesByLine: {},
    blamesByRevision: {},
    revisionDecorations: {},
    logs: {},
    workingCopy: true,
};

export const createBlameLookups = (
    blames: Blame[],
): { blamesByLine: BlamesByLine; blamesByRevision: BlamesByRevision } => {
    const blamesByLine: BlamesByLine = {};
    const blamesByRevision: BlamesByRevision = {};

    for (const blame of blames) {
        blamesByLine[blame.line] = blame;

        if (!blamesByRevision[blame.revision]) {
            blamesByRevision[blame.revision] = [];
        }
        blamesByRevision[blame.revision].push(blame);
    }

    return { blamesByLine, blamesByRevision };
};

export const mapToDecorationRecord = (record: Partial<DecorationRecord>): DecorationRecord =>
    merge({}, defaultRecord, record);
