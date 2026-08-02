import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { INDICATOR_COUNT } from "./generate-indicators.mjs";

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
        "greenToRed",
        "orange",
        "random",
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

test("generates the green-to-red range and unchanged random palettes", () => {
    const greenToRedDirectory = path.join(SOURCE_INDICATORS_DIR, "greenToRed");
    const firstGreenToRed = readSvg(greenToRedDirectory, "0000.svg");
    const lastGreenToRed = readSvg(greenToRedDirectory, "0499.svg");

    assert.strictEqual(getSvgFiles(greenToRedDirectory).length, INDICATOR_COUNT);
    assert.match(firstGreenToRed, /fill="hsl\(0\.0000, 68\.0000%, 45\.0000%\)"/);
    assert.match(lastGreenToRed, /fill="hsl\(142\.0000, 62\.0000%, 38\.0000%\)"/);

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
