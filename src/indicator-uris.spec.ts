import * as assert from "assert";

import { INDICATOR_COLOR_PALETTES } from "./indicator-colors";
import {
    getChronologicalIndicatorUri,
    getRandomIndicatorUri,
    INDICATOR_COUNT,
} from "./indicator-uris";

const decodeSvg = (uri: unknown): string =>
    Buffer.from(String(uri).split(",")[1], "base64").toString("utf8");

suite("Indicator URIs", () => {
    test("preserves the chronological endpoint colours", () => {
        const expectedStrongColours = {
            blue: "rgb(31.0000, 95.0000, 159.0000)",
            teal: "rgb(0.0000, 115.0000, 93.0000)",
            violet: "rgb(111.0000, 75.0000, 156.0000)",
            vermilion: "rgb(158.0000, 63.0000, 19.0000)",
        } as const;

        assert.match(
            decodeSvg(getChronologicalIndicatorUri("redToGreen", 0)),
            /fill="hsl\(0\.0000, 68\.0000%, 45\.0000%\)"/,
        );
        assert.match(
            decodeSvg(getChronologicalIndicatorUri("redToGreen", INDICATOR_COUNT - 1)),
            /fill="hsl\(142\.0000, 62\.0000%, 38\.0000%\)"/,
        );

        for (const palette of INDICATOR_COLOR_PALETTES) {
            assert.match(
                decodeSvg(getChronologicalIndicatorUri(palette, 0)),
                /fill="rgb\(255\.0000, 255\.0000, 255\.0000\)"/,
            );
            assert.ok(
                decodeSvg(getChronologicalIndicatorUri(palette, INDICATOR_COUNT - 1)).includes(
                    `fill="${expectedStrongColours[palette]}"`,
                ),
            );
        }
    });

    test("preserves the random palette endpoint colours", () => {
        const expectedPaleColours = {
            blue: "rgb(112.0000, 165.0000, 219.0000)",
            teal: "rgb(83.0000, 174.0000, 152.0000)",
            violet: "rgb(180.0000, 139.0000, 208.0000)",
            vermilion: "rgb(222.0000, 133.0000, 93.0000)",
        } as const;

        for (const palette of INDICATOR_COLOR_PALETTES) {
            assert.strictEqual(
                getRandomIndicatorUri(palette, 0),
                getChronologicalIndicatorUri(palette, INDICATOR_COUNT - 1),
            );
            assert.ok(
                decodeSvg(getRandomIndicatorUri(palette, INDICATOR_COUNT - 1)).includes(
                    `fill="${expectedPaleColours[palette]}"`,
                ),
            );
        }
    });
});
