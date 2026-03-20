import { createXmlParser } from "../util/xml-parser";

const parser = createXmlParser({
    alwaysCreateTextNode: true,
});

export const mapLogOutputToMessage = (data: string): string | undefined => {
    const json = parser.parse(data);

    return json?.log?.logentry?.msg?.text;
};
