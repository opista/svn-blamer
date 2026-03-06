# AGENTS.md

## Commit And PR Conventions

- All commit messages and PR titles MUST follow Conventional Commits.
- Squash merge commit titles MUST also follow Conventional Commits, because `release-please` derives release notes and version bumps from commits on `main`.
- Use one of these types when the change should appear in release notes:
    - `feat`: new user-facing functionality
    - `fix`: bug fixes
    - `perf`: performance improvements
    - `refactor`: internal changes that should appear under `Changed`
    - `deps`: dependency updates that should appear under `Changed`
- Use `chore`, `docs`, `test`, and `ci` for changes that should not trigger a release by themselves.

## Format

- Required shape:
    - `type: short summary`
    - Optional scope: `type(scope): short summary`
    - Breaking change: `type(scope)!: short summary` and/or `BREAKING CHANGE:` footer
- Allowed `type` values: `feat`, `fix`, `perf`, `refactor`, `deps`, `chore`, `docs`, `test`, `ci`.
- PR titles and commit subjects MUST match this regex:
    - `^(feat|fix|perf|refactor|deps|chore|docs|test|ci)(\([a-z0-9._/-]+\))?!?: \S.+$`
- Use lowercase for `type` and scope.
- Keep the summary concise and imperative (for example, `add`, `fix`, `update`).

## Examples

- `feat: add repository-scoped credential storage`
- `fix: prevent command argument injection via filename`
- `perf: reduce blame decoration churn while scrolling`
- `refactor: simplify hover decoration lifecycle`
- `deps: update fast-xml-parser`
- `chore: automate release flow`

## Release Notes Mapping

- `feat` -> `Added`
- `fix` -> `Fixed`
- `perf`, `refactor`, `deps` -> `Changed`

## Notes For Agents

- NEVER use emoji in PR titles or commit messages.
- NEVER prepend or append extra tokens in PR titles (for example: `[JULES]`, `WIP:`, `Draft:`, `🚀`, `(no ticket)`).
- NEVER invent non-standard types when a standard type fits.
- If a change is not releasable, use `chore`, `docs`, `test`, or `ci`.
- If uncertain, default to `chore`.

## Invalid Examples

- `✨ feat: add x` (emoji is not allowed)
- `Feature: add x` (invalid type and casing)
- `feat add x` (missing colon)
- `feat(scope) add x` (missing colon)
- `chore(scope):` (missing summary)
- `[JULES] fix: correct crash` (extra prefix is not allowed)
