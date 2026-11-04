import { execFile } from "node:child_process";
import { access, readFile, stat } from "node:fs/promises";
import path from "node:path";

export interface GitSvnContext {
    repoRoot: string;
    gitDir: string;
    svnBaseUrl: string;
    /** Remote-tracking ref recorded by git-svn, for example refs/remotes/git-svn. */
    syncRef: string;
    /** SVN revision that syncRef was fetched at. */
    syncRevision: string;
    /** Repository-relative path using forward slashes. */
    relativePath: string;
}

export type GitSvnFileState = "not-git-svn" | "clean" | "dirty" | "untracked" | "missing-at-sync";

const runGit = (
    repoRoot: string,
    args: string[],
): Promise<{ code: number; stdout: string; stderr: string }> => {
    return new Promise((resolve) => {
        execFile(
            "git",
            args,
            { cwd: repoRoot, maxBuffer: 16 * 1024 * 1024 },
            (err, stdout, stderr) => {
                const code = typeof err?.code === "number" ? err.code : err ? 1 : 0;
                resolve({ code, stdout: stdout ?? "", stderr: stderr ?? "" });
            },
        );
    });
};

const locateGitDir = async (
    startDir: string,
): Promise<{ repoRoot: string; gitDir: string } | undefined> => {
    let dir = path.resolve(startDir);

    for (;;) {
        const gitPath = path.join(dir, ".git");
        try {
            const info = await stat(gitPath);
            if (info.isDirectory()) {
                return { repoRoot: dir, gitDir: gitPath };
            }
            if (info.isFile()) {
                const content = await readFile(gitPath, "utf8");
                const match = content.match(/gitdir:\s*(.+)/);
                if (match) {
                    return { repoRoot: dir, gitDir: path.resolve(dir, match[1].trim()) };
                }
            }
        } catch {
            // keep walking
        }

        const parent = path.dirname(dir);
        if (parent === dir) {
            return undefined;
        }
        dir = parent;
    }
};

interface SvnRemoteConfig {
    url?: string;
    ref?: string;
}

const parseSvnRemote = (config: string): SvnRemoteConfig => {
    const lines = config.split(/\r?\n/);
    let inSection = false;
    let url: string | undefined;
    let ref: string | undefined;

    for (const line of lines) {
        if (/^\s*\[svn-remote\s+"[^"]+"\]/.test(line)) {
            if (inSection && url) {
                break;
            }
            inSection = true;
            continue;
        }
        if (/^\s*\[/.test(line)) {
            if (inSection && url) {
                break;
            }
            inSection = false;
            continue;
        }
        if (!inSection) {
            continue;
        }

        const urlMatch = line.match(/^\s*url\s*=\s*(.+?)\s*$/);
        if (urlMatch) {
            url = urlMatch[1];
        }
        const fetchMatch = line.match(/^\s*fetch\s*=\s*[^:]*:(.+?)\s*$/);
        if (fetchMatch) {
            ref = fetchMatch[1];
        }
    }

    return { url, ref };
};

export const joinSvnUrl = (base: string, relativePath: string): string => {
    return `${base.replace(/\/+$/, "")}/${relativePath.replace(/^\/+/, "")}`;
};

export const resolveGitSvnContext = async (
    fileName: string,
): Promise<GitSvnContext | undefined> => {
    const located = await locateGitDir(path.dirname(fileName));
    if (!located) {
        return undefined;
    }

    try {
        await access(path.join(located.gitDir, "svn", ".metadata"));
    } catch {
        return undefined;
    }

    let configText: string;
    try {
        configText = await readFile(path.join(located.gitDir, "config"), "utf8");
    } catch {
        return undefined;
    }

    const remote = parseSvnRemote(configText);
    if (!remote.url) {
        return undefined;
    }

    const syncRef = remote.ref || "refs/remotes/git-svn";
    const log = await runGit(located.repoRoot, ["log", "-1", "--format=%B", syncRef]);
    if (log.code !== 0) {
        return undefined;
    }

    const revisionMatch = log.stdout.match(/git-svn-id:\s+\S+@(\d+)\s+/);
    if (!revisionMatch) {
        return undefined;
    }

    const relativePath = path.relative(located.repoRoot, fileName).split(path.sep).join("/");
    if (!relativePath || relativePath.startsWith("../") || path.isAbsolute(relativePath)) {
        return undefined;
    }

    return {
        repoRoot: located.repoRoot,
        gitDir: located.gitDir,
        svnBaseUrl: remote.url,
        syncRef,
        syncRevision: revisionMatch[1],
        relativePath,
    };
};

/**
 * Decide whether a git-svn file can be blamed against the fetched SVN revision.
 * Uncommitted edits and commits that are not on the git-svn ref would shift line numbers.
 */
export const classifyGitSvnFile = async (
    fileName: string,
): Promise<{ state: GitSvnFileState; context?: GitSvnContext }> => {
    const context = await resolveGitSvnContext(fileName);
    if (!context) {
        return { state: "not-git-svn" };
    }

    const status = await runGit(context.repoRoot, [
        "status",
        "--porcelain",
        "--",
        context.relativePath,
    ]);
    if (status.code !== 0) {
        return { state: "dirty", context };
    }

    const statusLine = status.stdout.trim();
    if (statusLine.startsWith("??")) {
        return { state: "untracked", context };
    }
    if (statusLine.length > 0) {
        return { state: "dirty", context };
    }

    const exists = await runGit(context.repoRoot, [
        "cat-file",
        "-e",
        `${context.syncRef}:${context.relativePath}`,
    ]);
    if (exists.code !== 0) {
        return { state: "missing-at-sync", context };
    }

    const diff = await runGit(context.repoRoot, [
        "diff",
        "--quiet",
        context.syncRef,
        "--",
        context.relativePath,
    ]);
    if (diff.code !== 0) {
        return { state: "dirty", context };
    }

    return { state: "clean", context };
};
