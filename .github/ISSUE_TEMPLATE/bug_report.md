---
name: Bug report
about: Create a report to help us improve SVN Blamer
title: "[BUG]"
labels: bug
assignees: ''

---

## 🐛 Bug Description
A clear and concise description of what the bug is.

## 🛠 Steps to Reproduce
1. Open a file in a repository managed by SVN.
2. Run command `SVN Blamer: Show blame` (or use shortcut `Ctrl+Alt+D` on Windows/Linux, `Ctrl+Cmd+X` on macOS).
3. See error...

## 📋 Expected Behavior
A clear and concise description of what you expected to happen.

## 📸 Screenshots/GIFs
If applicable, add screenshots or GIFs to help explain your problem (e.g., missing gutter icons, incorrect inline messages).

## 💻 Environment Details
- **VS Code Version:** [e.g. 1.85.0]
- **Extension Version:** [e.g. 0.7.6]
- **OS Version:** [e.g. Windows 11, macOS Sonoma, Ubuntu 22.04]
- **SVN Version:** (Run `svn --version` in your terminal)

## 📝 Extension Logs
Please provide the output from the SVN Blamer log channel:
1. Open the **Output** panel in VS Code (`View` -> `Output`).
2. Select **SVN Blamer** from the dropdown menu on the right.
3. Copy and paste the relevant logs here (redact any sensitive repository URLs if necessary).

```text
paste logs here

```

## ⚙️ Extension Settings

Are you using any custom configurations?

* `svnBlamer.svnExecutablePath`:
* `svnBlamer.autoBlame`:
* `svnBlamer.enableLogs`:
* `svnBlamer.enableVisualIndicators`:
* `svnBlamer.viewportBuffer`:

## 💡 Additional Context

Add any other context about the problem here (e.g., does it only happen on large files? files with non-English characters?).
