## 2026-01-15 - VS Code Decoration Types Overhead
**Learning:** In VS Code extensions, `window.createTextEditorDecorationType` is expensive. Creating one per line (O(N)) causes significant performance degradation. Grouping decorations by style (e.g., by revision/icon) allows reducing this to O(Revisions), drastically improving rendering performance.
**Action:** Always reuse decoration types where possible and batch `setDecorations` calls.
