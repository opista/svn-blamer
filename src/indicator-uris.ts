import { ColorThemeKind, Uri } from "vscode";

import {
    ChronologicalColorScheme,
    INDICATOR_COLOR_PALETTES,
    IndicatorColorPalette,
    IndicatorGradient,
    ThemeAwareIndicatorColorScheme,
} from "./indicator-colors";

export const INDICATOR_COUNT = 500;

const uriCache = new Map<string, Uri>();

const PALETTE_ENDPOINTS: Record<IndicatorColorPalette, readonly [string, string]> = {
    blue: ["#1f5f9f", "#70a5db"],
    teal: ["#00735d", "#53ae98"],
    violet: ["#6f4b9c", "#b48bd0"],
    vermilion: ["#9e3f13", "#de855d"],
};

export const LIGHT_INDICATOR_OUTLINE = "#475569";

const BUILT_IN_GRADIENTS = Object.fromEntries(
    INDICATOR_COLOR_PALETTES.map((palette) => [
        palette,
        { oldest: "#ffffff", newest: PALETTE_ENDPOINTS[palette][0] },
    ]),
) as Record<ThemeAwareIndicatorColorScheme, IndicatorGradient>;

const hexToRgb = (hex: string): readonly number[] => [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
];

const interpolateRgb = (start: readonly number[], end: readonly number[], ratio: number) => {
    const values = start.map((value, index) => value + (end[index] - value) * ratio);
    return `rgb(${values.map((value) => value.toFixed(4)).join(", ")})`;
};

const clamp = (value: number, minimum = 0, maximum = 1): number =>
    Math.min(Math.max(value, minimum), maximum);

const srgbToLinear = (value: number): number => {
    const normalised = value / 255;
    return normalised <= 0.04045 ? normalised / 12.92 : ((normalised + 0.055) / 1.055) ** 2.4;
};

const linearToSrgb = (value: number): number => {
    const normalised = value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055;
    return clamp(normalised) * 255;
};

type Oklab = readonly [number, number, number];
type OklabGradient = Readonly<{ start: Oklab; end: Oklab }>;

const oklabGradientCache = new Map<string, OklabGradient>();

const rgbToOklab = (hex: string): Oklab => {
    const [red, green, blue] = hexToRgb(hex).map(srgbToLinear);
    const l = 0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue;
    const m = 0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue;
    const s = 0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue;
    const lRoot = Math.cbrt(l);
    const mRoot = Math.cbrt(m);
    const sRoot = Math.cbrt(s);

    return [
        0.2104542553 * lRoot + 0.793617785 * mRoot - 0.0040720468 * sRoot,
        1.9779984951 * lRoot - 2.428592205 * mRoot + 0.4505937099 * sRoot,
        0.0259040371 * lRoot + 0.7827717662 * mRoot - 0.808675766 * sRoot,
    ];
};

const oklabToRgb = ([lightness, a, b]: Oklab): readonly number[] => {
    const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;

    return [
        linearToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
        linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
        linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
    ];
};

const getOklabGradient = (start: string, end: string): OklabGradient => {
    const cacheKey = `${start}:${end}`;
    const cached = oklabGradientCache.get(cacheKey);
    if (cached) {
        return cached;
    }

    const gradient = { start: rgbToOklab(start), end: rgbToOklab(end) };
    oklabGradientCache.set(cacheKey, gradient);
    return gradient;
};

const interpolateOklab = (start: string, end: string, ratio: number): string => {
    const { start: startOklab, end: endOklab } = getOklabGradient(start, end);
    const interpolated: Oklab = [
        startOklab[0] + (endOklab[0] - startOklab[0]) * ratio,
        startOklab[1] + (endOklab[1] - startOklab[1]) * ratio,
        startOklab[2] + (endOklab[2] - startOklab[2]) * ratio,
    ];
    return `rgb(${oklabToRgb(interpolated)
        .map((value) => value.toFixed(4))
        .join(", ")})`;
};

const createIndicatorUri = (color: string, outline?: string): Uri => {
    const cacheKey = `${color}:${outline ?? ""}`;
    const cached = uriCache.get(cacheKey);
    if (cached) {
        return cached;
    }

    const stroke = outline ? ` stroke="${outline}" stroke-width="7"` : "";
    const svg = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" fill="${color}" r="30"${stroke}/></svg>`;
    const uri = Uri.parse(`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`);
    uriCache.set(cacheKey, uri);
    return uri;
};

export const clearIndicatorUriCache = (): void => {
    uriCache.clear();
    oklabGradientCache.clear();
};

const indexToRatio = (index: number): number => clamp(index / (INDICATOR_COUNT - 1));

export const getBuiltInIndicatorGradient = (
    scheme: ThemeAwareIndicatorColorScheme,
): IndicatorGradient => BUILT_IN_GRADIENTS[scheme];

export const usesLightThemeIndicatorOutline = (themeKind: ColorThemeKind): boolean =>
    themeKind === ColorThemeKind.Light || themeKind === ColorThemeKind.HighContrastLight;

export const getChronologicalIndicatorUri = (
    scheme: ChronologicalColorScheme,
    index: number,
    gradient?: IndicatorGradient,
    outline?: string,
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

    if (!gradient) {
        throw new Error(`A gradient is required for ${scheme} indicator colours.`);
    }

    return createIndicatorUri(interpolateOklab(gradient.oldest, gradient.newest, ratio), outline);
};

export const getRandomIndicatorUri = (palette: IndicatorColorPalette, index: number): Uri => {
    const [strong, pale] = PALETTE_ENDPOINTS[palette];
    return createIndicatorUri(
        interpolateRgb(hexToRgb(strong), hexToRgb(pale), indexToRatio(index)),
    );
};
