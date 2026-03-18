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

        const failStdin = (message: string): void => {
            inputWriteFailed = true;
            err.push(Buffer.from(message));
            if (!child.killed) {
                child.kill();
            }
        };

        if (options?.input !== undefined) {
            if (child.stdin && child.stdin.writable) {
                child.stdin.on("error", (e) =>
                    failStdin(`Failed to write input to stdin: ${e.message}`),
                );
                try {
                    child.stdin.write(options.input);
                    child.stdin.end();
                } catch (e) {
                    const message = e instanceof Error ? e.message : String(e);
                    failStdin(`Failed to write input to stdin: ${message}`);
                }
            } else {
                failStdin("Cannot write input to child process: stdin is not writable");
            }
        }
    });
};
