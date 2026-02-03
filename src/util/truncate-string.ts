export const truncateString = (str?: string) => {
    if (!str) {
        return "";
    }

    if (str.length > 17) {
        return `${str.substring(0, 20).trim()}...`;
    }

    return str;
};
