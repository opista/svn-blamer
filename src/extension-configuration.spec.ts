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
                    format?: string;
                    pattern?: string;
                    title?: string;
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
            "teal",
            "violet",
            "vermilion",
            "custom",
        ]);
        assert.deepStrictEqual(properties["svnBlamer.indicatorColorScheme"]?.enumItemLabels, [
            "Random",
            "Red → Green",
            "Blue",
            "Teal",
            "Violet",
            "Vermilion",
            "Custom gradient",
        ]);
        assert.strictEqual(properties["svnBlamer.indicatorColorScheme"]?.order, 4);
        assert.deepStrictEqual(properties["svnBlamer.indicatorCustomOldestColor"], {
            scope: "resource",
            order: 5,
            title: "Oldest commit colour",
            default: "#6b7280",
            description:
                "Used only with Custom gradient. Enter an opaque #RRGGBB colour. This exact value does not adapt to the active theme, so use enough contrast.",
            type: "string",
            format: "color-hex",
            pattern: "^#[0-9a-fA-F]{6}$",
        });
        assert.deepStrictEqual(properties["svnBlamer.indicatorCustomNewestColor"], {
            scope: "resource",
            order: 6,
            title: "Newest commit colour",
            default: "#1f5f9f",
            description:
                "Used only with Custom gradient. Enter an opaque #RRGGBB colour. This exact value does not adapt to the active theme, so use enough contrast.",
            type: "string",
            format: "color-hex",
            pattern: "^#[0-9a-fA-F]{6}$",
        });
        assert.deepStrictEqual(properties["svnBlamer.indicatorCustomOutlineColor"], {
            scope: "resource",
            order: 7,
            title: "Custom indicator outline colour",
            default: "",
            description:
                "Used only with Custom gradient. Optionally enter an opaque #RRGGBB colour to outline each indicator. Leave blank for no outline.",
            type: "string",
            pattern: "^(|#[0-9a-fA-F]{6})$",
        });
        assert.strictEqual(properties["svnBlamer.indicatorColorPalette"], undefined);
        assert.strictEqual(properties["svnBlamer.indicatorColorContrast"], undefined);
    });
});
