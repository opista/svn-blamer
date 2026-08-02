import { readFileSync } from "node:fs";
import path from "node:path";

import * as assert from "assert";

type ExtensionPackage = {
    contributes: {
        configuration: {
            properties: Record<
                string,
                {
                    default?: unknown;
                    enum?: unknown[];
                    enumItemLabels?: unknown[];
                    markdownDescription?: string;
                    order?: number;
                    scope?: unknown;
                }
            >;
        };
    };
};

suite("Extension configuration", () => {
    test("declares the indicator colour scheme setting", () => {
        const packageJson = JSON.parse(
            readFileSync(path.join(process.cwd(), "package.json"), "utf8"),
        ) as ExtensionPackage;
        const properties = packageJson.contributes.configuration.properties;

        assert.strictEqual(properties["svnBlamer.indicatorColorScheme"]?.default, "random");
        assert.deepStrictEqual(properties["svnBlamer.indicatorColorScheme"]?.enum, [
            "random",
            "redToGreen",
            "blue",
            "sky",
            "teal",
            "violet",
            "orange",
            "vermilion",
        ]);
        assert.deepStrictEqual(properties["svnBlamer.indicatorColorScheme"]?.enumItemLabels, [
            "Random",
            "Red → Green",
            "Blue",
            "Sky blue",
            "Teal",
            "Violet",
            "Orange",
            "Vermilion",
        ]);
        assert.strictEqual(properties["svnBlamer.indicatorColorScheme"]?.order, 4);
        assert.strictEqual(properties["svnBlamer.indicatorColorPalette"], undefined);
        assert.strictEqual(properties["svnBlamer.indicatorColorContrast"], undefined);
    });
});
