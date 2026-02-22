import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
    ignoreAttributes: false,
    trimValues: true,
    textNodeName: "text",
});

export const mapInfoOutputToRepoRoot = (data: string): string | undefined => {
    const json = parser.parse(data);
    const entry = Array.isArray(json?.info?.entry) ? json.info.entry[0] : json?.info?.entry;
    const root = entry?.repository?.root;
    if (typeof root === "string" && root) {
        return root;
    }
    if (typeof root?.text === "string" && root.text) {
        return root.text;
    }
    return undefined;
};
