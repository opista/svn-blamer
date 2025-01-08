import { spawn, SpawnOptionsWithoutStdio } from "node:child_process";

export const spawnProcess = (
    script: string,
    options?: SpawnOptionsWithoutStdio,
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const child = spawn(script, { ...options, shell: true });

        let data = "";
        let err = "";

        child.stdout.on("data", (chunk) => {
            data += chunk.toString();
        });

        child.stderr.on("data", (chunk) => {
            err += chunk.toString();
        });

        child.stdout.on("close", (code: number) => {
            if (err || code) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    });
};
