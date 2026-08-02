import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
    copyMarketplaceAssets,
    createGeneratedAssetCopyState,
    createIndicatorGenerator,
    generateIndicators,
    INDICATOR_COUNT,
    shouldCopyImageAssets,
} from "./generate-indicators.mjs";

const SOURCE_INDICATORS_DIR = path.join("src", "img", "indicators");
const DIST_INDICATORS_DIR = path.join("dist", "img", "indicators");
const SINGLE_HUE_SCHEMES = ["blue", "sky", "teal", "violet", "orange", "vermilion"];
const RANDOM_PALETTES = ["blue", "sky", "teal", "violet", "orange", "vermilion"];

const getSvgFiles = (directory) =>
    fs
        .readdirSync(directory)
        .filter((fileName) => fileName.endsWith(".svg"))
        .sort();

const readSvg = (directory, fileName) => fs.readFileSync(path.join(directory, fileName), "utf8");

const getDirectoryNames = (directory) =>
    fs
        .readdirSync(directory, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort();

test("prunes obsolete generated asset directories after a build", () => {
    const expectedDirectories = [
        "blue",
        "orange",
        "random",
        "redToGreen",
        "sky",
        "teal",
        "vermilion",
        "violet",
    ];

    assert.deepStrictEqual(getDirectoryNames(SOURCE_INDICATORS_DIR), expectedDirectories);
    assert.deepStrictEqual(getDirectoryNames(DIST_INDICATORS_DIR), expectedDirectories);
    assert.deepStrictEqual(
        getDirectoryNames(path.join(SOURCE_INDICATORS_DIR, "random")),
        [...RANDOM_PALETTES].sort(),
    );
    assert.deepStrictEqual(
        getDirectoryNames(path.join(DIST_INDICATORS_DIR, "random")),
        [...RANDOM_PALETTES].sort(),
    );
});

test("does not rewrite unchanged indicator assets", () => {
    assert.strictEqual(generateIndicators(), false);
});

test("generates indicators once per build context", () => {
    let generationCalls = 0;
    const generateForBuild = createIndicatorGenerator(() => {
        generationCalls++;
        return true;
    });

    assert.strictEqual(generateForBuild(), true);
    assert.strictEqual(generateForBuild(), false);
    assert.strictEqual(generationCalls, 1);
});

test("retains changed generated assets until a successful copy", () => {
    const copyState = createGeneratedAssetCopyState();

    copyState.markSourceAssetsChanged(true);
    assert.strictEqual(copyState.shouldCopy(false), true);

    copyState.markSourceAssetsChanged(false);
    assert.strictEqual(copyState.shouldCopy(false), true);

    copyState.markCopied();
    assert.strictEqual(copyState.shouldCopy(false), false);
});

test("copies image assets when the build output is missing or stale", () => {
    const imageDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "svn-blamer-image-assets-"));
    const indicatorsDirectory = path.join(imageDirectory, "indicators");
    const palettes = [...SINGLE_HUE_SCHEMES, "redToGreen"];

    try {
        assert.strictEqual(shouldCopyImageAssets(imageDirectory, 1), true);

        fs.mkdirSync(path.join(imageDirectory, "marketplace"), { recursive: true });
        fs.writeFileSync(path.join(imageDirectory, "marketplace", "icon.png"), "icon");

        for (const palette of palettes) {
            fs.mkdirSync(path.join(indicatorsDirectory, palette), { recursive: true });
            fs.writeFileSync(path.join(indicatorsDirectory, palette, "0000.svg"), "svg");
        }
        for (const palette of RANDOM_PALETTES) {
            const directory = path.join(indicatorsDirectory, "random", palette);
            fs.mkdirSync(directory, { recursive: true });
            fs.writeFileSync(path.join(directory, "0000.svg"), "svg");
        }

        assert.strictEqual(shouldCopyImageAssets(imageDirectory, 1), false);

        fs.rmSync(path.join(indicatorsDirectory, "random", "blue", "0000.svg"));
        assert.strictEqual(shouldCopyImageAssets(imageDirectory, 1), true);
    } finally {
        fs.rmSync(imageDirectory, { force: true, recursive: true });
    }
});

test("copies changed marketplace assets on every successful build", () => {
    const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "svn-blamer-marketplace-"));
    const sourceImageDirectory = path.join(temporaryDirectory, "source");
    const outputImageDirectory = path.join(temporaryDirectory, "output");

    try {
        fs.mkdirSync(path.join(sourceImageDirectory, "marketplace"), { recursive: true });
        fs.mkdirSync(path.join(outputImageDirectory, "marketplace"), { recursive: true });
        fs.writeFileSync(path.join(sourceImageDirectory, "marketplace", "icon.png"), "new icon");
        fs.writeFileSync(path.join(outputImageDirectory, "marketplace", "icon.png"), "old icon");

        copyMarketplaceAssets(sourceImageDirectory, outputImageDirectory);

        assert.strictEqual(
            fs.readFileSync(path.join(outputImageDirectory, "marketplace", "icon.png"), "utf8"),
            "new icon",
        );
    } finally {
        fs.rmSync(temporaryDirectory, { force: true, recursive: true });
    }
});

test("generates complete single-hue chronological ranges", () => {
    for (const scheme of SINGLE_HUE_SCHEMES) {
        const sourceDirectory = path.join(SOURCE_INDICATORS_DIR, scheme);
        const distDirectory = path.join(DIST_INDICATORS_DIR, scheme);
        const files = getSvgFiles(sourceDirectory);

        assert.strictEqual(files.length, INDICATOR_COUNT);
        assert.match(
            readSvg(sourceDirectory, "0000.svg"),
            /fill="rgb\(255\.0000, 255\.0000, 255\.0000\)"/,
        );
        assert.doesNotMatch(
            readSvg(sourceDirectory, "0499.svg"),
            /fill="rgb\(255\.0000, 255\.0000, 255\.0000\)"/,
        );
        assert.strictEqual(
            readSvg(distDirectory, "0000.svg"),
            readSvg(sourceDirectory, "0000.svg"),
        );
        assert.strictEqual(
            readSvg(distDirectory, "0499.svg"),
            readSvg(sourceDirectory, "0499.svg"),
        );
    }
});

test("generates the red-to-green range and unchanged random palettes", () => {
    const redToGreenDirectory = path.join(SOURCE_INDICATORS_DIR, "redToGreen");
    const firstRedToGreen = readSvg(redToGreenDirectory, "0000.svg");
    const lastRedToGreen = readSvg(redToGreenDirectory, "0499.svg");

    assert.strictEqual(getSvgFiles(redToGreenDirectory).length, INDICATOR_COUNT);
    assert.match(firstRedToGreen, /fill="hsl\(0\.0000, 68\.0000%, 45\.0000%\)"/);
    assert.match(lastRedToGreen, /fill="hsl\(142\.0000, 62\.0000%, 38\.0000%\)"/);

    for (const palette of RANDOM_PALETTES) {
        const sourceDirectory = path.join(SOURCE_INDICATORS_DIR, "random", palette);
        const distDirectory = path.join(DIST_INDICATORS_DIR, "random", palette);

        assert.strictEqual(getSvgFiles(sourceDirectory).length, INDICATOR_COUNT);
        assert.strictEqual(
            readSvg(distDirectory, "0000.svg"),
            readSvg(sourceDirectory, "0000.svg"),
        );
    }
});
