import * as assert from "assert";

import {
    createChronologicalIconMap,
    createRandomIconMap,
    createRandomIconOrder,
    DEFAULT_CUSTOM_INDICATOR_GRADIENT,
    getCustomIndicatorGradient,
    getCustomIndicatorOutline,
    getIndicatorColorScheme,
    INDICATOR_COLOR_PALETTES,
    sortRevisions,
} from "./indicator-colors";

suite("Indicator colours", () => {
    const iconsByPalette = Object.fromEntries(
        INDICATOR_COLOR_PALETTES.map((palette) => [
            palette,
            Array.from({ length: 5 }, (_, index) => `${palette}-${index}`),
        ]),
    ) as Record<(typeof INDICATOR_COLOR_PALETTES)[number], string[]>;

    test("sorts SVN revisions numerically without losing precision", () => {
        assert.deepStrictEqual(sortRevisions(["9007199254740993", "10", "2", "10"]), [
            "2",
            "10",
            "9007199254740993",
        ]);
    });

    test("falls back to safe indicator settings for invalid configuration values", () => {
        assert.strictEqual(getIndicatorColorScheme("unexpected"), "random");
        assert.strictEqual(getIndicatorColorScheme("greenToRed"), "random");
    });

    test("uses safe defaults for each invalid custom gradient endpoint", () => {
        assert.deepStrictEqual(getCustomIndicatorGradient("#ABCDEF", "not-a-colour"), {
            oldest: "#abcdef",
            newest: DEFAULT_CUSTOM_INDICATOR_GRADIENT.newest,
        });
        assert.deepStrictEqual(getCustomIndicatorGradient(undefined, "#123456"), {
            oldest: DEFAULT_CUSTOM_INDICATOR_GRADIENT.oldest,
            newest: "#123456",
        });
    });

    test("allows equal custom gradient endpoints for a single-colour scheme", () => {
        assert.deepStrictEqual(getCustomIndicatorGradient("#123456", "#123456"), {
            oldest: "#123456",
            newest: "#123456",
        });
    });

    test("uses an optional valid custom outline and ignores invalid values", () => {
        assert.strictEqual(getCustomIndicatorOutline("#ABCDEF"), "#abcdef");
        assert.strictEqual(getCustomIndicatorOutline(""), undefined);
        assert.strictEqual(getCustomIndicatorOutline("not-a-colour"), undefined);
    });

    test("maps chronological revisions from oldest to newest", () => {
        const icons = createChronologicalIconMap(["30", "10", "20"], ["dark", "middle", "light"]);

        assert.deepStrictEqual(icons, {
            "10": "dark",
            "20": "middle",
            "30": "light",
        });
    });

    test("uses the newest endpoint for a single chronological revision", () => {
        assert.deepStrictEqual(createChronologicalIconMap(["10"], ["dark", "light"]), {
            "10": "light",
        });
    });

    test("uses distinct chronological colours through 500 revisions", () => {
        const revisions = Array.from({ length: 500 }, (_, index) => `${index + 1}`);
        const icons = Array.from({ length: 500 }, (_, index) => `icon-${index}`);

        assert.strictEqual(
            new Set(Object.values(createChronologicalIconMap(revisions, icons))).size,
            500,
        );
    });

    test("reuses chronological colours only after 500 revisions", () => {
        const revisions = Array.from({ length: 501 }, (_, index) => `${index + 1}`);
        const icons = Array.from({ length: 500 }, (_, index) => `icon-${index}`);

        assert.strictEqual(
            new Set(Object.values(createChronologicalIconMap(revisions, icons))).size,
            500,
        );
    });

    test("creates a stable, contrast-first random icon order for a file", () => {
        const first = createRandomIconOrder(iconsByPalette, "/workspace/example.ts");
        const second = createRandomIconOrder(iconsByPalette, "/workspace/example.ts");

        assert.deepStrictEqual(first, second);
        assert.strictEqual(first.length, INDICATOR_COLOR_PALETTES.length * 5);
        assert.strictEqual(
            new Set(first.slice(0, INDICATOR_COLOR_PALETTES.length * 2)).size,
            INDICATOR_COLOR_PALETTES.length * 2,
        );
    });

    test("creates only the required random icon prefix", () => {
        const fullOrder = createRandomIconOrder(iconsByPalette, "/workspace/example.ts");
        const requiredOrder = createRandomIconOrder(iconsByPalette, "/workspace/example.ts", 3);

        assert.deepStrictEqual(requiredOrder, fullOrder.slice(0, 3));
    });

    test("reuses random icons only after the ordered palette is exhausted", () => {
        const icons = createRandomIconMap(["1", "2", "3"], ["first", "second"]);

        assert.deepStrictEqual(icons, {
            "1": "first",
            "2": "second",
            "3": "first",
        });
    });
});
