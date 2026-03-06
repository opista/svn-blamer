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

interface XmlAttribute {
    [key: string]: string | undefined;
}

interface XmlNode {
    text?: string;
    attributes?: XmlAttribute;
}

type XmlValue = string | XmlNode;

interface XmlCommit {
    author?: XmlValue;
    date?: XmlValue;
    attributes?: {
        revision?: string;
    };
}

interface XmlEntry {
    commit?: XmlCommit;
    attributes?: {
        "line-number"?: string;
    };
}

interface XmlTarget {
    entry?: XmlEntry[];
}

interface XmlBlame {
    blame?: {
        target?: XmlTarget;
    };
}

const getText = (node: XmlValue | undefined): string | undefined => {
    if (typeof node === "string") {
        return node;
    }
    return node?.text;
};

export const mapBlameOutputToBlameModel = (data: string): Blame[] => {
    const json = parser.parse(data) as XmlBlame;

    return (
        json?.blame?.target?.entry?.reduce((acc: Blame[], entry: XmlEntry) => {
            const revision = entry.commit?.attributes?.revision ?? "";
            if (revision && revision !== "-") {
                acc.push({
                    author: getText(entry.commit?.author),
                    date: getText(entry.commit?.date),
                    line: entry.attributes?.["line-number"] ?? "",
                    revision,
                });
            }
            return acc;
        }, []) || []
    );
};
