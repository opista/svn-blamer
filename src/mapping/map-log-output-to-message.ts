import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    attributesGroupName: "attributes",
    textNodeName: "text",
    trimValues: true,
    alwaysCreateTextNode: true,
    parseTagValue: false,
    parseAttributeValue: false,
});

export const mapLogOutputToMessage = (data: string): string | undefined => {
    const json = parser.parse(data);

    return json?.log?.logentry?.msg?.text;
};
