export const truncateString = (str?: string) => {
    if (!str) {
        return "";
    }

    if (str.length > 20) {
        return `${str.substring(0, 17).trim()}...`;
    }

    return str;
};
