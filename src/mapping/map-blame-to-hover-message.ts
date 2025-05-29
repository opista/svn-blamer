import { DateTime } from "luxon";

import { Blame } from "../types/blame.model";

const mapAuthor = (author?: string) => (author ? `$(account) ${author}` : "");

const mapRevisionDate = (date?: string) => {
    if (!date) {
        return "";
    }

    const revisionDateRelative = DateTime.fromISO(date).toRelative({ round: true });

    const revisionDate = DateTime.fromISO(date).toLocaleString(DateTime.DATETIME_MED);

    const revisionTimestamp = `$(history) ${revisionDateRelative} _(${revisionDate})_`;

    return revisionTimestamp;
};

const mapRevisionNumber = (revision?: string) => (revision ? `$(git-commit) ${revision}` : "");

export const mapBlameToHoverMessage = (blame: Blame, log?: string) => {
    const { author, date, revision } = blame;

    const authorText = mapAuthor(author);
    const revisionDateText = mapRevisionDate(date);
    const revisionNumberText = mapRevisionNumber(revision);

    const header = [authorText, revisionDateText, revisionNumberText]
        .filter(Boolean)
        .join("&nbsp;&nbsp;|&nbsp;&nbsp;");

    return [header, log].join("\n\n");
};
