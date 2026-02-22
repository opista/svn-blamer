import * as assert from "assert";

import { mapInfoOutputToRepoRoot } from "../mapping/map-info-output-to-repo-root";

suite("Map Info Output To Repo Root Test Suite", () => {
    test("should parse correct xml", () => {
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<info>
<entry
   kind="file"
   path="foo.c"
   revision="2">
<url>http://svn.red-bean.com/repos/test/foo.c</url>
<repository>
<root>http://svn.red-bean.com/repos/test</root>
<uuid>557a54f0-4696-4190-9f1d-135515321516</uuid>
</repository>
<wc-info>
<schedule>normal</schedule>
<depth>infinity</depth>
<text-updated>2003-01-16T22:38:23.957640Z</text-updated>
<checksum>d6c8e3175402a46c245c7f847528d906</checksum>
</wc-info>
<commit
   revision="2">
<author>sally</author>
<date>2003-01-14T23:25:13.298750Z</date>
</commit>
</entry>
</info>`;
        const result = mapInfoOutputToRepoRoot(xml);
        assert.strictEqual(result, "http://svn.red-bean.com/repos/test");
    });

    test("should parse correct xml with multiple entries", () => {
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<info>
<entry
   kind="file"
   path="foo.c"
   revision="2">
<url>http://svn.red-bean.com/repos/test/foo.c</url>
<repository>
<root>http://svn.red-bean.com/repos/test</root>
<uuid>557a54f0-4696-4190-9f1d-135515321516</uuid>
</repository>
</entry>
<entry
   kind="file"
   path="bar.c"
   revision="3">
<url>http://svn.red-bean.com/repos/test/bar.c</url>
<repository>
<root>http://svn.red-bean.com/repos/test</root>
<uuid>557a54f0-4696-4190-9f1d-135515321516</uuid>
</repository>
</entry>
</info>`;
        const result = mapInfoOutputToRepoRoot(xml);
        assert.strictEqual(result, "http://svn.red-bean.com/repos/test");
    });

    test("should return undefined for invalid xml", () => {
        const xml = `<info><entry><repository></repository></entry></info>`;
        const result = mapInfoOutputToRepoRoot(xml);
        assert.strictEqual(result, undefined);
    });

    test("should return undefined when root is missing", () => {
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<info>
<entry
   kind="file"
   path="foo.c"
   revision="2">
<url>http://svn.red-bean.com/repos/test/foo.c</url>
<repository>
<uuid>557a54f0-4696-4190-9f1d-135515321516</uuid>
</repository>
</entry>
</info>`;
        const result = mapInfoOutputToRepoRoot(xml);
        assert.strictEqual(result, undefined);
    });

    test("should handle root with attributes", () => {
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<info>
<entry
   kind="file"
   path="foo.c"
   revision="2">
<url>http://svn.red-bean.com/repos/test/foo.c</url>
<repository>
<root some-attr="some-value">http://svn.red-bean.com/repos/test</root>
<uuid>557a54f0-4696-4190-9f1d-135515321516</uuid>
</repository>
</entry>
</info>`;
        const result = mapInfoOutputToRepoRoot(xml);
        assert.strictEqual(result, "http://svn.red-bean.com/repos/test");
    });

    test("should handle empty string", () => {
        const result = mapInfoOutputToRepoRoot("");
        assert.strictEqual(result, undefined);
    });

    test("should handle garbage input", () => {
        const result = mapInfoOutputToRepoRoot("not xml");
        assert.strictEqual(result, undefined);
    });
});
