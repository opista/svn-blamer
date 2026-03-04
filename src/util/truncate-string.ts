const MAX_STRING_LENGTH = 20;
const ELLIPSIS = "...";

export const truncateString = (str?: string) => {
    if (!str) {
        return "";
    }

    if (str.length > MAX_STRING_LENGTH) {
        return `${str.substring(0, MAX_STRING_LENGTH - ELLIPSIS.length).trim()}${ELLIPSIS}`;
    }

    return str;
};
