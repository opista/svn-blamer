import { spawn, SpawnOptionsWithoutStdio } from "node:child_process";

export interface ISpawnProcessOptions extends SpawnOptionsWithoutStdio {
    input?: string;
}

export const spawnProcess = (
    command: string,
    args: string[],
    options?: ISpawnProcessOptions,
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, { ...options, shell: false });
        const data: Buffer[] = [];
        const err: Buffer[] = [];
        let settled = false;
        let inputWriteFailed = false;

        const rejectOnce = (reason: unknown): void => {
            if (!settled) {
                settled = true;
                reject(reason);
            }
        };

        const resolveOnce = (output: string): void => {
            if (!settled) {
                settled = true;
                resolve(output);
            }
        };

        child.stdout.on("data", (chunk: Buffer) => {
            data.push(chunk);
        });

        child.stderr.on("data", (chunk: Buffer) => {
            err.push(chunk);
        });

        child.on("close", (code: number | null) => {
            if (code !== 0 || inputWriteFailed) {
                const errorString = Buffer.concat(err).toString();
                rejectOnce(errorString);
            } else {
                const dataString = Buffer.concat(data).toString();
                resolveOnce(dataString);
            }
        });

        child.on("error", (childError) => rejectOnce(childError));

        if (options?.input !== undefined) {
            if (child.stdin && child.stdin.writable) {
                child.stdin.on("error", (e) => {
                    inputWriteFailed = true;
                    err.push(Buffer.from(`Failed to write input to stdin: ${e.message}`));
                    if (!child.killed) {
                        child.kill();
                    }
                });
                try {
                    child.stdin.write(options.input);
                    child.stdin.end();
                } catch (e) {
                    inputWriteFailed = true;
                    const message = e instanceof Error ? e.message : String(e);
                    err.push(Buffer.from(`Failed to write input to stdin: ${message}`));
                    if (!child.killed) {
                        child.kill();
                    }
                }
            } else {
                inputWriteFailed = true;
                err.push(Buffer.from("Cannot write input to child process: stdin is not writable"));
                if (!child.killed) {
                    child.kill();
                }
            }
        }
    });
};
