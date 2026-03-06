"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const map_blame_output_to_blame_model_1 = require("./src/mapping/map-blame-output-to-blame-model");
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
const jsonStr = JSON.stringify(xml);
const start = performance.now();
for (let i = 0; i < 500; i++) {
    (0, map_blame_output_to_blame_model_1.mapBlameOutputToBlameModel)(JSON.parse(jsonStr));
}
const end = performance.now();
console.log(`Time taken: ${(end - start).toFixed(2)}ms`);
//# sourceMappingURL=benchmark.js.map