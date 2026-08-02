import fs from "fs";
import path from "path";

export const INDICATOR_COUNT = 500;

const RANDOM_PALETTES = {
    blue: ["#1f5f9f", "#70a5db"],
    sky: ["#257dac", "#8bc7e9"],
    teal: ["#00735d", "#53ae98"],
    violet: ["#6f4b9c", "#b48bd0"],
    orange: ["#9b5c00", "#e6ad45"],
    vermilion: ["#9e3f13", "#de855d"],
};
const SINGLE_HUE_SCHEMES = Object.keys(RANDOM_PALETTES);
const INDICATOR_DIRECTORIES = ["redToGreen", "random", ...SINGLE_HUE_SCHEMES];

const RED_TO_GREEN_STOPS = [
    // The scale runs from the oldest revision to the newest revision.
    { hue: 0, saturation: 68, lightness: 45 },
    { hue: 142, saturation: 62, lightness: 38 },
];

const hexToRgb = (hex) => [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
];

const interpolateColor = (startHex, endHex, ratio) => {
    const start = hexToRgb(startHex);
    const end = hexToRgb(endHex);
    const values = start.map((value, index) => value + (end[index] - value) * ratio);

    return `rgb(${values.map((value) => value.toFixed(4)).join(", ")})`;
};

const interpolateChronologicalColor = (stops, ratio) => {
    const segmentCount = stops.length - 1;
    const scaledRatio = ratio * segmentCount;
    const segmentIndex = Math.min(Math.floor(scaledRatio), segmentCount - 1);
    const segmentRatio = scaledRatio - segmentIndex;
    const start = stops[segmentIndex];
    const end = stops[segmentIndex + 1];
    const hue = start.hue + (end.hue - start.hue) * segmentRatio;
    const saturation = start.saturation + (end.saturation - start.saturation) * segmentRatio;
    const lightness = start.lightness + (end.lightness - start.lightness) * segmentRatio;

    return `hsl(${hue.toFixed(4)}, ${saturation.toFixed(4)}%, ${lightness.toFixed(4)}%)`;
};

const createSvgContent = (color) =>
    `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" fill="${color}" r="30"/></svg>`;

const generatePalette = (outputDir, getColor, count) => {
    fs.mkdirSync(outputDir, { recursive: true });
    let changed = false;

    for (let index = 0; index < count; index++) {
        const ratio = count === 1 ? 1 : index / (count - 1);
        const color = getColor(ratio);
        const fileName = path.join(outputDir, `${index.toString().padStart(4, "0")}.svg`);
        const svgContent = createSvgContent(color);

        if (!fs.existsSync(fileName) || fs.readFileSync(fileName, "utf8") !== svgContent) {
            fs.writeFileSync(fileName, svgContent);
            changed = true;
        }
    }

    return changed;
};

const pruneDirectory = (directory, allowedNames) => {
    if (!fs.existsSync(directory)) {
        return false;
    }

    let changed = false;
    for (const entry of fs.readdirSync(directory)) {
        if (!allowedNames.has(entry)) {
            fs.rmSync(path.join(directory, entry), { force: true, recursive: true });
            changed = true;
        }
    }

    return changed;
};

export const pruneGeneratedIndicators = (outputDir, count = INDICATOR_COUNT) => {
    const indicatorFileNames = new Set(
        Array.from({ length: count }, (_, index) => `${index.toString().padStart(4, "0")}.svg`),
    );
    const indicatorDirectories = new Set(INDICATOR_DIRECTORIES);

    let changed = pruneDirectory(outputDir, indicatorDirectories);
    changed = pruneDirectory(path.join(outputDir, "redToGreen"), indicatorFileNames) || changed;

    for (const scheme of SINGLE_HUE_SCHEMES) {
        changed = pruneDirectory(path.join(outputDir, scheme), indicatorFileNames) || changed;
    }

    const randomDirectory = path.join(outputDir, "random");
    changed = pruneDirectory(randomDirectory, new Set(SINGLE_HUE_SCHEMES)) || changed;

    for (const palette of SINGLE_HUE_SCHEMES) {
        changed =
            pruneDirectory(path.join(randomDirectory, palette), indicatorFileNames) || changed;
    }

    return changed;
};

const hasExactEntries = (directory, expectedNames) => {
    if (!fs.existsSync(directory)) {
        return false;
    }

    const entries = fs.readdirSync(directory);
    return (
        entries.length === expectedNames.size && entries.every((entry) => expectedNames.has(entry))
    );
};

export const hasCompleteGeneratedIndicators = (outputDir, count = INDICATOR_COUNT) => {
    const indicatorFileNames = new Set(
        Array.from({ length: count }, (_, index) => `${index.toString().padStart(4, "0")}.svg`),
    );
    const indicatorDirectories = new Set(INDICATOR_DIRECTORIES);

    if (!hasExactEntries(outputDir, indicatorDirectories)) {
        return false;
    }

    if (!hasExactEntries(path.join(outputDir, "redToGreen"), indicatorFileNames)) {
        return false;
    }

    for (const scheme of SINGLE_HUE_SCHEMES) {
        if (!hasExactEntries(path.join(outputDir, scheme), indicatorFileNames)) {
            return false;
        }
    }

    const randomDirectory = path.join(outputDir, "random");
    if (!hasExactEntries(randomDirectory, new Set(SINGLE_HUE_SCHEMES))) {
        return false;
    }

    return SINGLE_HUE_SCHEMES.every((palette) =>
        hasExactEntries(path.join(randomDirectory, palette), indicatorFileNames),
    );
};

export const shouldCopyImageAssets = (
    outputImageDir = path.join("dist", "img"),
    count = INDICATOR_COUNT,
) =>
    !fs.existsSync(path.join(outputImageDir, "marketplace", "icon.png")) ||
    !hasCompleteGeneratedIndicators(path.join(outputImageDir, "indicators"), count);

export const copyMarketplaceAssets = (
    sourceImageDir = path.join("src", "img"),
    outputImageDir = path.join("dist", "img"),
) => {
    fs.cpSync(path.join(sourceImageDir, "marketplace"), path.join(outputImageDir, "marketplace"), {
        force: true,
        recursive: true,
    });
};

export const generateIndicators = (count = INDICATOR_COUNT) => {
    const outputDir = path.join("src", "img", "indicators");

    // Do not remove existing source or dist assets before generating. During a watch
    // build, the running extension reads dist assets and must retain them until the
    // copy step has replaced them.

    let changed = generatePalette(
        path.join(outputDir, "redToGreen"),
        (ratio) => interpolateChronologicalColor(RED_TO_GREEN_STOPS, ratio),
        count,
    );

    for (const [paletteName, [strong, pale]] of Object.entries(RANDOM_PALETTES)) {
        changed =
            generatePalette(
                path.join(outputDir, paletteName),
                (ratio) => interpolateColor("#ffffff", strong, ratio),
                count,
            ) || changed;
        changed =
            generatePalette(
                path.join(outputDir, "random", paletteName),
                (ratio) => interpolateColor(strong, pale, ratio),
                count,
            ) || changed;
    }

    return pruneGeneratedIndicators(outputDir, count) || changed;
};

export const createIndicatorGenerator = (generate = generateIndicators) => {
    let generated = false;

    return () => {
        if (generated) {
            return false;
        }

        const changed = generate();
        generated = true;
        return changed;
    };
};

export const createGeneratedAssetCopyState = () => {
    let sourceAssetsChanged = false;

    return {
        markSourceAssetsChanged: (changed) => {
            sourceAssetsChanged ||= changed;
        },
        shouldCopy: (destinationAssetsStale) => sourceAssetsChanged || destinationAssetsStale,
        markCopied: () => {
            sourceAssetsChanged = false;
        },
    };
};
