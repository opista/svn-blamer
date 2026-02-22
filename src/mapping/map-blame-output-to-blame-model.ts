import { XMLParser } from "fast-xml-parser";

import { Blame } from "../types/blame.model";

const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    attributesGroupName: "attributes",
    textNodeName: "text",
    trimValues: true,
    parseTagValue: false,
    parseAttributeValue: false,
    isArray: (name) => name === "entry",
});

export const mapBlameOutputToBlameModel = (data: string): Blame[] => {
    const json = parser.parse(data);

    const blamed: Blame[] =
        json?.blame?.target?.entry?.map((entry: any) => ({
            author: entry?.commit?.author?.text ?? entry?.commit?.author,
            date: entry?.commit?.date?.text ?? entry?.commit?.date,
            line: entry?.attributes?.["line-number"],
            revision: entry?.commit?.attributes?.revision,
        })) || [];

    return blamed.filter(({ revision }) => revision && revision !== "-");
};
