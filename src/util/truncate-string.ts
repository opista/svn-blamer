export const truncateString = (str?: string) => {
    if (!str) {
        return "";
    }

    const MAX_LENGTH = 20;
    const SUFFIX = "...";

    if (str.length > MAX_LENGTH) {
        const TRUNCATE_INDEX = MAX_LENGTH - SUFFIX.length;
        return `${str.substring(0, TRUNCATE_INDEX).trim()}${SUFFIX}`;
    }

    return str;
};
