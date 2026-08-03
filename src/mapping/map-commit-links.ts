import { CommitLink } from "../types/commit-link.model";

// Replace `$0` (whole match) and `$1`..`$9` (capture groups) placeholders in a
// template with values from a single regex match. Unmatched groups become "".
const applyTemplate = (template: string, match: RegExpMatchArray): string =>
    template.replace(/\$([0-9])/g, (_, index) => match[Number(index)] ?? "");

// Scan text for user-configured ticket/issue references and turn each match into
// a clickable markdown link. Driven entirely by the `svnBlamer.commitLinks`
// setting, so it works with any tracker (ServiceNow, Jira, GitHub, etc.) and
// returns nothing when unconfigured. Duplicate links are removed.
export const mapCommitLinks = (text: string, links: CommitLink[] = []): string[] => {
    const results: string[] = [];
    const seen = new Set<string>();

    for (const link of links) {
        if (!link?.pattern || !link?.url) {
            continue;
        }

        let regex: RegExp;
        try {
            // Always global (required by matchAll) and case-insensitive.
            regex = new RegExp(link.pattern, "gi");
        } catch {
            // Skip malformed patterns rather than breaking the hover.
            continue;
        }

        for (const match of text.matchAll(regex)) {
            const url = applyTemplate(link.url, match);

            // Only render http(s) links. Repository settings are resource-scoped,
            // so a workspace could supply a rule; restricting the scheme keeps a
            // malicious `command:`/`file:` URL out of the hover markdown.
            if (!/^https?:\/\//i.test(url)) {
                continue;
            }

            const label = applyTemplate(link.title ?? "$0", match) || match[0];
            const icon = link.icon === undefined ? "$(link) " : link.icon ? `$(${link.icon}) ` : "";

            const key = `${label}|${url}`;
            if (seen.has(key)) {
                continue;
            }
            seen.add(key);

            results.push(`[${icon}${label}](${url})`);
        }
    }

    return results;
};
