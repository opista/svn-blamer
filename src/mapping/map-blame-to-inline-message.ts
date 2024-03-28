import { DateTime } from "luxon";

import { Blame } from "../types/blame.model";
import { truncateString } from "../util/truncate-string";

export const mapBlameToInlineMessage = (blame: Blame, log?: string): string => {
    const { author, date, revision } = blame;

    const timeRelative =
        date &&
        DateTime.fromISO(date).toRelative({
            round: true,
        });

    const authorAndTime = [author, timeRelative].filter(Boolean).join(", ");
    const truncatedLog = truncateString(log);
    const prefix = `${revision}: ${authorAndTime}`;

    return [prefix, truncatedLog].join(" • ");
};
