import { X2jOptions, XMLParser } from "fast-xml-parser";

export const createXmlParser = (options?: Partial<X2jOptions>): XMLParser => {
    return new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "",
        attributesGroupName: "attributes",
        textNodeName: "text",
        trimValues: true,
        parseTagValue: false,
        parseAttributeValue: false,
        ...options,
    });
};
