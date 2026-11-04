import { spawn, SpawnOptionsWithoutStdio } from "node:child_process";

export interface ISpawnProcessOptions extends SpawnOptionsWithoutStdio {
    input?: string;
}

export interface ISpawnProcessResult {
    stdout: string;
    stderr: string;
}

/**
 * Prefer UTF-8. Some SVN servers emit GBK when a byte sequence is not valid UTF-8.
 */
const decodeSvnOutput = (buffer: Buffer): string => {
    try {
        return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    } catch {
        return new TextDecoder("gb18030").decode(buffer);
    }
};

export const spawnProcess = (
    command: string,
    args: string[],
    options?: ISpawnProcessOptions,
): Promise<ISpawnProcessResult> => {
    return new Promise((resolve, reject) => {
        const { input, ...spawnOptions } = options ?? {};
        const child = spawn(command, args, { ...spawnOptions, shell: false });
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

        const resolveOnce = (output: ISpawnProcessResult): void => {
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
            const stderrOutput = decodeSvnOutput(Buffer.concat(err));

            if (code !== 0 || inputWriteFailed) {
                rejectOnce(stderrOutput);
            } else {
                const dataString = decodeSvnOutput(Buffer.concat(data));
                resolveOnce({ stdout: dataString, stderr: stderrOutput });
            }
        });

        child.on("error", (childError) => rejectOnce(childError));

        if (input !== undefined) {
            const failStdin = (message: string): void => {
                inputWriteFailed = true;
                err.push(Buffer.from(message));
                if (!child.killed) {
                    child.kill();
                }
            };

            if (child.stdin && child.stdin.writable) {
                child.stdin.on("error", (e) =>
                    failStdin(`Failed to write input to stdin: ${e.message}`),
                );
                try {
                    child.stdin.write(input);
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
