import fs from "node:fs";

import * as esbuild from "esbuild";

const copyMarketplaceAssetsPlugin = {
    name: "copy-marketplace-assets",
    setup(build) {
        build.onEnd((result) => {
            if (result.errors.length === 0) {
                fs.cpSync("src/img/marketplace", "dist/img/marketplace", {
                    force: true,
                    recursive: true,
                });
                fs.rmSync("dist/img/indicators", { force: true, recursive: true });
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
    plugins: [copyMarketplaceAssetsPlugin],
    sourcemap: process.argv.includes("--sourcemap"),
});

if (process.argv.includes("--watch")) {
    await ctx.watch();
} else {
    await ctx.rebuild();
    await ctx.dispose();
}
