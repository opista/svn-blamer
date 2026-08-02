export const INDICATOR_COLOR_SCHEMES = [
    "random",
    "greenToRed",
    "blue",
    "sky",
    "teal",
    "violet",
    "orange",
    "vermilion",
] as const;
export const INDICATOR_COLOR_PALETTES = [
    "blue",
    "sky",
    "teal",
    "violet",
    "orange",
    "vermilion",
] as const;

export type IndicatorColorScheme = (typeof INDICATOR_COLOR_SCHEMES)[number];
export type IndicatorColorPalette = (typeof INDICATOR_COLOR_PALETTES)[number];
export type ChronologicalColorScheme = Exclude<IndicatorColorScheme, "random">;

export const getIndicatorColorScheme = (value: unknown): IndicatorColorScheme =>
    value === "redToGreen"
        ? "greenToRed"
        : INDICATOR_COLOR_SCHEMES.includes(value as IndicatorColorScheme)
          ? (value as IndicatorColorScheme)
          : "random";

const hashString = (value: string): number => {
    let hash = 2166136261;

    for (let index = 0; index < value.length; index++) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }

    return hash >>> 0;
};

const createSeededShuffle = <T>(items: readonly T[], seed: number): T[] => {
    const shuffled = [...items];
    let state = seed || 1;

    const next = () => {
        state ^= state << 13;
        state ^= state >>> 17;
        state ^= state << 5;
        return state >>> 0;
    };

    for (let index = shuffled.length - 1; index > 0; index--) {
        const swapIndex = next() % (index + 1);
        [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }

    return shuffled;
};

export const sortRevisions = (revisions: readonly string[]): string[] =>
    [...new Set(revisions)].sort((left, right) => {
        try {
            const difference = BigInt(left) - BigInt(right);
            return difference === 0n ? 0 : difference < 0n ? -1 : 1;
        } catch {
            return left.localeCompare(right, undefined, { numeric: true });
        }
    });

export const createChronologicalIconMap = (
    revisions: readonly string[],
    iconPaths: readonly string[],
): Record<string, string | undefined> => {
    const sortedRevisions = sortRevisions(revisions);
    const icons: Record<string, string | undefined> = {};

    if (sortedRevisions.length === 0 || iconPaths.length === 0) {
        return icons;
    }

    if (sortedRevisions.length === 1) {
        icons[sortedRevisions[0]] = iconPaths[iconPaths.length - 1];
        return icons;
    }

    for (const [index, revision] of sortedRevisions.entries()) {
        const iconIndex = Math.round(
            (index * (iconPaths.length - 1)) / (sortedRevisions.length - 1),
        );
        icons[revision] = iconPaths[iconIndex];
    }

    return icons;
};

const createIntermediateIndexes = (count: number): number[] => {
    if (count < 3) {
        return [];
    }

    const indexes: number[] = [];
    const ranges: Array<[number, number]> = [[0, count - 1]];

    while (ranges.length > 0) {
        const [start, end] = ranges.shift()!;
        const middle = Math.floor((start + end) / 2);

        if (middle === start || middle === end) {
            continue;
        }

        indexes.push(middle);
        ranges.push([start, middle], [middle, end]);
    }

    return indexes;
};

export const createRandomIconOrder = (
    iconsByPalette: Readonly<Record<IndicatorColorPalette, readonly string[]>>,
    fileName: string,
): string[] => {
    const palettes = createSeededShuffle(INDICATOR_COLOR_PALETTES, hashString(fileName));
    const iconCount = Math.min(...palettes.map((palette) => iconsByPalette[palette].length));

    if (!Number.isFinite(iconCount) || iconCount === 0) {
        return [];
    }

    const order: string[] = [];
    const add = (palette: IndicatorColorPalette, index: number) => {
        const icon = iconsByPalette[palette][index];
        if (icon) {
            order.push(icon);
        }
    };

    palettes.forEach((palette, index) => add(palette, index % 2 === 0 ? iconCount - 1 : 0));
    palettes.forEach((palette, index) => add(palette, index % 2 === 0 ? 0 : iconCount - 1));

    for (const iconIndex of createIntermediateIndexes(iconCount)) {
        for (const palette of palettes) {
            add(palette, iconIndex);
        }
    }

    return order;
};

export const createRandomIconMap = (
    revisions: readonly string[],
    iconPaths: readonly string[],
): Record<string, string | undefined> => {
    const icons: Record<string, string | undefined> = {};
    const sortedRevisions = sortRevisions(revisions);

    for (const [index, revision] of sortedRevisions.entries()) {
        icons[revision] = iconPaths[index % iconPaths.length];
    }

    return icons;
};
