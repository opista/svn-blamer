import fs from "node:fs";

import * as esbuild from "esbuild";

import {
    copyMarketplaceAssets,
    generateIndicators,
    pruneGeneratedIndicators,
    shouldCopyImageAssets,
} from "./_scripts/generate-indicators.mjs";

const generateIndicatorsPlugin = {
    name: "generate-indicators",
    setup(build) {
        let assetsChanged = false;

        build.onStart(() => {
            assetsChanged = generateIndicators();
        });

        build.onEnd((result) => {
            if (result.errors.length === 0) {
                copyMarketplaceAssets();

                if (!assetsChanged && !shouldCopyImageAssets()) {
                    return;
                }

                fs.cpSync("src/img", "dist/img", { force: true, recursive: true });
                pruneGeneratedIndicators("dist/img/indicators");
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
