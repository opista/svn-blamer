import { Uri } from "vscode";

import { ChronologicalColorScheme, IndicatorColorPalette } from "./indicator-colors";

export const INDICATOR_COUNT = 500;

const uriCache = new Map<string, Uri>();

const PALETTE_ENDPOINTS: Record<IndicatorColorPalette, readonly [string, string]> = {
    blue: ["#1f5f9f", "#70a5db"],
    sky: ["#257dac", "#8bc7e9"],
    teal: ["#00735d", "#53ae98"],
    violet: ["#6f4b9c", "#b48bd0"],
    orange: ["#9b5c00", "#e6ad45"],
    vermilion: ["#9e3f13", "#de855d"],
};

const hexToRgb = (hex: string): readonly number[] => [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
];

const interpolateColor = (start: readonly number[], end: readonly number[], ratio: number) => {
    const values = start.map((value, index) => value + (end[index] - value) * ratio);
    return `rgb(${values.map((value) => value.toFixed(4)).join(", ")})`;
};

const createIndicatorUri = (color: string): Uri => {
    const cached = uriCache.get(color);
    if (cached) {
        return cached;
    }

    const svg = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" fill="${color}" r="30"/></svg>`;
    const uri = Uri.parse(`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`);
    uriCache.set(color, uri);
    return uri;
};

const indexToRatio = (index: number): number => index / (INDICATOR_COUNT - 1);

export const getChronologicalIndicatorUri = (
    scheme: ChronologicalColorScheme,
    index: number,
): Uri => {
    const ratio = indexToRatio(index);

    if (scheme === "redToGreen") {
        const hue = 142 * ratio;
        const saturation = 68 + (62 - 68) * ratio;
        const lightness = 45 + (38 - 45) * ratio;
        return createIndicatorUri(
            `hsl(${hue.toFixed(4)}, ${saturation.toFixed(4)}%, ${lightness.toFixed(4)}%)`,
        );
    }

    const [strong] = PALETTE_ENDPOINTS[scheme];
    return createIndicatorUri(interpolateColor([255, 255, 255], hexToRgb(strong), ratio));
};

export const getRandomIndicatorUri = (palette: IndicatorColorPalette, index: number): Uri => {
    const [strong, pale] = PALETTE_ENDPOINTS[palette];
    return createIndicatorUri(
        interpolateColor(hexToRgb(strong), hexToRgb(pale), indexToRatio(index)),
    );
};
