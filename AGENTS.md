# AGENTS.md

## Commit And PR Conventions

- Use Conventional Commits for all commit messages and PR titles.
- Prefer squash merge commit titles that also follow Conventional Commits, because `release-please` derives release notes and version bumps from commits on `main`.
- Use one of these types when the change should appear in release notes:
    - `feat`: new user-facing functionality
    - `fix`: bug fixes
    - `perf`: performance improvements
    - `refactor`: internal changes that should appear under `Changed`
    - `deps`: dependency updates that should appear under `Changed`
- Use `chore`, `docs`, `test`, and `ci` for changes that should not trigger a release by themselves.

## Format

- Use `type: short summary`
- Optional scope is allowed: `type(scope): short summary`
- Breaking changes must use `!` or a `BREAKING CHANGE:` footer

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

- Do not use emoji prefixes in commit messages or PR titles.
- Do not invent non-standard types when a standard type fits.
- If a change is not releasable, prefer `chore`, `docs`, `test`, or `ci`.
