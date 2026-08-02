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
const INDICATOR_DIRECTORIES = ["greenToRed", "random", ...SINGLE_HUE_SCHEMES];

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

    for (let index = 0; index < count; index++) {
        const ratio = count === 1 ? 1 : index / (count - 1);
        const color = getColor(ratio);
        const fileName = path.join(outputDir, `${index.toString().padStart(4, "0")}.svg`);
        fs.writeFileSync(fileName, createSvgContent(color));
    }
};

const pruneDirectory = (directory, allowedNames) => {
    if (!fs.existsSync(directory)) {
        return;
    }

    for (const entry of fs.readdirSync(directory)) {
        if (!allowedNames.has(entry)) {
            fs.rmSync(path.join(directory, entry), { force: true, recursive: true });
        }
    }
};

export const pruneGeneratedIndicators = (outputDir, count = INDICATOR_COUNT) => {
    const indicatorFileNames = new Set(
        Array.from({ length: count }, (_, index) => `${index.toString().padStart(4, "0")}.svg`),
    );
    const indicatorDirectories = new Set(INDICATOR_DIRECTORIES);

    pruneDirectory(outputDir, indicatorDirectories);
    pruneDirectory(path.join(outputDir, "greenToRed"), indicatorFileNames);

    for (const scheme of SINGLE_HUE_SCHEMES) {
        pruneDirectory(path.join(outputDir, scheme), indicatorFileNames);
    }

    const randomDirectory = path.join(outputDir, "random");
    pruneDirectory(randomDirectory, new Set(SINGLE_HUE_SCHEMES));

    for (const palette of SINGLE_HUE_SCHEMES) {
        pruneDirectory(path.join(randomDirectory, palette), indicatorFileNames);
    }
};

export const generateIndicators = (count = INDICATOR_COUNT) => {
    const outputDir = path.join("src", "img", "indicators");

    // Do not remove existing source or dist assets before generating. During a watch
    // build, the running extension reads dist assets and must retain them until the
    // copy step has replaced them.

    generatePalette(
        path.join(outputDir, "greenToRed"),
        (ratio) => interpolateChronologicalColor(RED_TO_GREEN_STOPS, ratio),
        count,
    );

    for (const [paletteName, [strong, pale]] of Object.entries(RANDOM_PALETTES)) {
        generatePalette(
            path.join(outputDir, paletteName),
            (ratio) => interpolateColor("#ffffff", strong, ratio),
            count,
        );
        generatePalette(
            path.join(outputDir, "random", paletteName),
            (ratio) => interpolateColor(strong, pale, ratio),
            count,
        );
    }

    pruneGeneratedIndicators(outputDir, count);
};
