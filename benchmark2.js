"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fast_xml_parser_1 = require("fast-xml-parser");
const parser = new fast_xml_parser_1.XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    attributesGroupName: "attributes",
    textNodeName: "text",
    trimValues: true,
    parseTagValue: false,
    parseAttributeValue: false,
    isArray: (name) => name === "entry",
});
const xml = `
<blame>
<target path="readme.txt">
` +
    Array.from({ length: 10000 })
        .map((_, i) => `
<entry line-number="${i + 1}">
<commit revision="${i % 2 === 0 ? i : "-"}">
<author>sally</author>
<date>2008-05-25T19:12:31.428953Z</date>
</commit>
</entry>
`)
        .join("") +
    `
</target>
</blame>
`;
const parsed = parser.parse(xml);
const getText = (node) => {
    if (typeof node === "string") {
        return node;
    }
    return node?.text;
};
// Original
function originalMap(json) {
    const blamed = json?.blame?.target?.entry?.map((entry) => ({
        author: getText(entry.commit?.author),
        date: getText(entry.commit?.date),
        line: entry.attributes?.["line-number"] ?? "",
        revision: entry.commit?.attributes?.revision ?? "",
    })) || [];
    return blamed.filter((item) => item.revision && item.revision !== "-");
}
// Reduce
function reduceMap(json) {
    return (json?.blame?.target?.entry?.reduce((acc, entry) => {
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
    }, []) || []);
}
// FlatMap
function flatMapMap(json) {
    return (json?.blame?.target?.entry?.flatMap((entry) => {
        const revision = entry.commit?.attributes?.revision ?? "";
        if (revision && revision !== "-") {
            return [
                {
                    author: getText(entry.commit?.author),
                    date: getText(entry.commit?.date),
                    line: entry.attributes?.["line-number"] ?? "",
                    revision,
                },
            ];
        }
        return [];
    }) || []);
}
let start = performance.now();
for (let i = 0; i < 5000; i++) {
    originalMap(parsed);
}
let end = performance.now();
console.log(`Original Time taken: ${(end - start).toFixed(2)}ms`);
start = performance.now();
for (let i = 0; i < 5000; i++) {
    reduceMap(parsed);
}
end = performance.now();
console.log(`Reduce Time taken: ${(end - start).toFixed(2)}ms`);
start = performance.now();
for (let i = 0; i < 5000; i++) {
    flatMapMap(parsed);
}
end = performance.now();
console.log(`FlatMap Time taken: ${(end - start).toFixed(2)}ms`);
// Loop
function loopMap(json) {
    const entries = json?.blame?.target?.entry;
    if (!entries) {
        return [];
    }
    const result = [];
    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const revision = entry.commit?.attributes?.revision ?? "";
        if (revision && revision !== "-") {
            result.push({
                author: getText(entry.commit?.author),
                date: getText(entry.commit?.date),
                line: entry.attributes?.["line-number"] ?? "",
                revision,
            });
        }
    }
    return result;
}
start = performance.now();
for (let i = 0; i < 5000; i++) {
    loopMap(parsed);
}
end = performance.now();
console.log(`Loop Time taken: ${(end - start).toFixed(2)}ms`);
// Loop for...of
function loopOfMap(json) {
    const entries = json?.blame?.target?.entry;
    if (!entries) {
        return [];
    }
    const result = [];
    for (const entry of entries) {
        const revision = entry.commit?.attributes?.revision ?? "";
        if (revision && revision !== "-") {
            result.push({
                author: getText(entry.commit?.author),
                date: getText(entry.commit?.date),
                line: entry.attributes?.["line-number"] ?? "",
                revision,
            });
        }
    }
    return result;
}
start = performance.now();
for (let i = 0; i < 5000; i++) {
    loopOfMap(parsed);
}
end = performance.now();
console.log(`Loop For...Of Time taken: ${(end - start).toFixed(2)}ms`);
//# sourceMappingURL=benchmark2.js.map