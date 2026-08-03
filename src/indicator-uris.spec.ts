import * as assert from "assert";
import { ColorThemeKind } from "vscode";

import { DEFAULT_CUSTOM_INDICATOR_GRADIENT, INDICATOR_COLOR_PALETTES } from "./indicator-colors";
import {
    clearIndicatorUriCache,
    getBuiltInIndicatorGradient,
    getChronologicalIndicatorUri,
    getRandomIndicatorUri,
    INDICATOR_COUNT,
    LIGHT_INDICATOR_OUTLINE,
    usesLightThemeIndicatorOutline,
} from "./indicator-uris";

const decodeSvg = (uri: unknown): string =>
    Buffer.from(String(uri).split(",")[1], "base64").toString("utf8");

const getRgbFill = (uri: unknown): number[] => {
    const match = /fill="rgb\(([^)]+)\)"/.exec(decodeSvg(uri));
    assert.ok(match, "indicator should contain an RGB fill colour");
    return match[1].split(", ").map(Number);
};

const hexToRgb = (hex: string): number[] => [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
];

const assertRgbApproximately = (actual: number[], expected: number[]) => {
    for (const [index, value] of expected.entries()) {
        assert.ok(Math.abs(actual[index] - value) < 0.01, `component ${index} should match`);
    }
};

suite("Indicator URIs", () => {
    teardown(() => clearIndicatorUriCache());

    test("keeps the red to green scheme from oldest to newest", () => {
        assert.match(
            decodeSvg(getChronologicalIndicatorUri("redToGreen", 0)),
            /fill="hsl\(0\.0000, 68\.0000%, 45\.0000%\)"/,
        );
        assert.match(
            decodeSvg(getChronologicalIndicatorUri("redToGreen", INDICATOR_COUNT - 1)),
            /fill="hsl\(142\.0000, 62\.0000%, 38\.0000%\)"/,
        );
    });

    test("uses shared endpoints for each built-in single-colour scheme", () => {
        for (const palette of INDICATOR_COLOR_PALETTES) {
            const gradient = getBuiltInIndicatorGradient(palette);
            assertRgbApproximately(
                getRgbFill(getChronologicalIndicatorUri(palette, 0, gradient)),
                hexToRgb(gradient.oldest),
            );
            assertRgbApproximately(
                getRgbFill(getChronologicalIndicatorUri(palette, INDICATOR_COUNT - 1, gradient)),
                hexToRgb(gradient.newest),
            );
        }
    });

    test("uses the custom gradient exactly from oldest to newest", () => {
        const gradient = { oldest: "#123456", newest: "#abcdef" };

        assertRgbApproximately(
            getRgbFill(getChronologicalIndicatorUri("custom", 0, gradient)),
            hexToRgb(gradient.oldest),
        );
        assertRgbApproximately(
            getRgbFill(getChronologicalIndicatorUri("custom", INDICATOR_COUNT - 1, gradient)),
            hexToRgb(gradient.newest),
        );
    });

    test("outlines built-in single-colour indicators only for light themes", () => {
        const gradient = getBuiltInIndicatorGradient("blue");
        const outlined = getChronologicalIndicatorUri("blue", 0, gradient, LIGHT_INDICATOR_OUTLINE);
        const plain = getChronologicalIndicatorUri("blue", 0, gradient);

        assert.match(decodeSvg(outlined), /stroke="#475569" stroke-width="7"/);
        assert.doesNotMatch(decodeSvg(plain), /stroke=/);
        assert.ok(usesLightThemeIndicatorOutline(ColorThemeKind.Light));
        assert.ok(usesLightThemeIndicatorOutline(ColorThemeKind.HighContrastLight));
        assert.ok(!usesLightThemeIndicatorOutline(ColorThemeKind.Dark));
        assert.ok(!usesLightThemeIndicatorOutline(ColorThemeKind.HighContrast));
    });

    test("uses OKLab interpolation for custom gradients", () => {
        const midpoint = getRgbFill(
            getChronologicalIndicatorUri("custom", Math.floor((INDICATOR_COUNT - 1) / 2), {
                oldest: "#6b7280",
                newest: "#1f5f9f",
            }),
        );

        assert.notDeepStrictEqual(midpoint, [69, 104, 143], "does not use direct RGB mixing");
    });

    test("clears cached SVG URIs when a colour input changes", () => {
        const first = getChronologicalIndicatorUri("custom", 0, DEFAULT_CUSTOM_INDICATOR_GRADIENT);
        const cached = getChronologicalIndicatorUri("custom", 0, DEFAULT_CUSTOM_INDICATOR_GRADIENT);

        clearIndicatorUriCache();

        const regenerated = getChronologicalIndicatorUri(
            "custom",
            0,
            DEFAULT_CUSTOM_INDICATOR_GRADIENT,
        );
        assert.strictEqual(first, cached);
        assert.notStrictEqual(first, regenerated);
    });

    test("preserves the random palette endpoint colours", () => {
        const expectedPaleColours = {
            blue: "rgb(112.0000, 165.0000, 219.0000)",
            teal: "rgb(83.0000, 174.0000, 152.0000)",
            violet: "rgb(180.0000, 139.0000, 208.0000)",
            vermilion: "rgb(222.0000, 133.0000, 93.0000)",
        } as const;

        for (const palette of INDICATOR_COLOR_PALETTES) {
            assert.ok(
                decodeSvg(getRandomIndicatorUri(palette, INDICATOR_COUNT - 1)).includes(
                    `fill="${expectedPaleColours[palette]}"`,
                ),
            );
        }
    });
});
