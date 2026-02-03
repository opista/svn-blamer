import { spawn, SpawnOptionsWithoutStdio } from "node:child_process";

export const spawnProcess = (
    command: string,
    args: string[],
    options?: SpawnOptionsWithoutStdio,
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, { ...options, shell: false });

        const data: Buffer[] = [];
        const err: Buffer[] = [];

        child.stdout.on("data", (chunk: Buffer) => {
            data.push(chunk);
        });

        child.stderr.on("data", (chunk: Buffer) => {
            err.push(chunk);
        });

        child.on("close", (code: number | null) => {
            if (code !== 0 || err.length > 0) {
                const errorString = Buffer.concat(err).toString();
                reject(errorString);
            } else {
                const dataString = Buffer.concat(data).toString();
                resolve(dataString);
            }
        });

        child.on("error", (err) => reject(err));
    });
};
