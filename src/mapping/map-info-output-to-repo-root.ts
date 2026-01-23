import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
    ignoreAttributes: false,
    trimValues: true,
    textNodeName: "text",
});

export const mapInfoOutputToRepoRoot = (data: string): string | undefined => {
    const json = parser.parse(data);
    const entry = Array.isArray(json?.info?.entry) ? json.info.entry[0] : json?.info?.entry;
    return entry?.repository?.root?.text ?? entry?.repository?.root;
};
