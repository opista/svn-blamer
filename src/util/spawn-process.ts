import { spawn, SpawnOptionsWithoutStdio } from "node:child_process";

export const spawnProcess = (
    script: string,
    options?: SpawnOptionsWithoutStdio,
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const child = spawn(script, { ...options, shell: true });

        const data: Buffer[] = [];
        const err: Buffer[] = [];

        child.stdout.on("data", (chunk: Buffer) => {
            data.push(chunk);
        });

        child.stderr.on("data", (chunk: Buffer) => {
            err.push(chunk);
        });

        child.stdout.on("close", (code: number) => {
            if (err.length > 0 || code) {
                const errorString = Buffer.concat(err).toString();
                reject(errorString);
            } else {
                const dataString = Buffer.concat(data).toString();
                resolve(dataString);
            }
        });
    });
};
