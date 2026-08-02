import fs from "node:fs";

import * as esbuild from "esbuild";

import {
    copyMarketplaceAssets,
    createGeneratedAssetCopyState,
    createIndicatorGenerator,
    generateIndicators,
    pruneGeneratedIndicators,
    shouldCopyImageAssets,
} from "./_scripts/generate-indicators.mjs";

const generateIndicatorsPlugin = {
    name: "generate-indicators",
    setup(build) {
        let assetsChanged = false;
        const generateForBuild = createIndicatorGenerator(generateIndicators);
        const generatedAssetCopyState = createGeneratedAssetCopyState();

        build.onStart(() => {
            assetsChanged = generateForBuild();
            generatedAssetCopyState.markSourceAssetsChanged(assetsChanged);
        });

        build.onEnd((result) => {
            if (result.errors.length === 0) {
                copyMarketplaceAssets();

                if (!generatedAssetCopyState.shouldCopy(shouldCopyImageAssets())) {
                    return;
                }

                fs.cpSync("src/img", "dist/img", { force: true, recursive: true });
                pruneGeneratedIndicators("dist/img/indicators");
                generatedAssetCopyState.markCopied();
            }
        });
    },
};

let ctx = await esbuild.context({
    bundle: true,
    entryPoints: ["./src/extension.ts"],
    external: ["vscode"],
    format: "cjs",
    logLevel: "debug",
    minify: process.argv.includes("--minify"),
    outfile: "./dist/extension.js",
    platform: "node",
    plugins: [generateIndicatorsPlugin],
    sourcemap: process.argv.includes("--sourcemap"),
});

if (process.argv.includes("--watch")) {
    await ctx.watch();
} else {
    await ctx.rebuild();
    await ctx.dispose();
}
