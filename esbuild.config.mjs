import * as esbuild from "esbuild";
import { copy } from "esbuild-plugin-copy";

let ctx = await esbuild.context({
    bundle: true,
    entryPoints: ["./src/extension.ts"],
    external: ["vscode"],
    format: "cjs",
    logLevel: "debug",
    minify: process.argv.includes("--minify"),
    outfile: "./dist/extension.js",
    platform: "node",
    plugins: [
        copy({
            resolveFrom: "cwd",
            assets: {
                from: ["./src/img/**/*"],
                to: ["./dist/img"],
            },
        }),
    ],
    sourcemap: process.argv.includes("--sourcemap"),
});

if (process.argv.includes("--watch")) {
    await ctx.watch();
} else {
    await ctx.rebuild();
    await ctx.dispose();
}
