import * as esbuild from "esbuild";
import { copy } from "esbuild-plugin-copy";

(async () => {
    const res = await esbuild.build({
        bundle: true,
        entryPoints: ["./src/extension.ts"],
        external: ["vscode"],
        format: "cjs",
        minify: true,
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
            copy({
                resolveFrom: "cwd",
                assets: {
                    from: ["./public/**/*"],
                    to: ["./dist/public"],
                },
            }),
        ],
    });
})();
