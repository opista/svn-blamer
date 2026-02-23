Since your project uses a modern **pnpm** workspace, **esbuild** for bundling, and a custom **SVG indicator generator**, a contribution guide is essential to ensure new developers don't break the build pipeline.

Here is a `CONTRIBUTING.md` template tailored specifically to your project's architecture (like the `_scripts` folder and `husky` integration).

---

## Contributing to SVN Blamer

First off, thanks for taking the time to contribute! Contributions are what make the open-source community such an amazing place to learn, inspire, and create.

## 🏗 Local Development Setup

This project uses **pnpm** as a package manager. Please ensure you have it installed before starting.

1. **Clone the repository:**
```bash
git clone https://github.com/BeauAgst/blamer-vs.git
cd blamer-vs

```


2. **Install dependencies:**
```bash
pnpm install

```


3. **Generate Assets:**
The project uses a script to generate 3,000 distinct SVG indicators for the gutter. This runs automatically during the build, but you can trigger it via:
```bash
pnpm run esbuild

```


4. **Run in VS Code:**
* Press `F5` in VS Code to open a new **Extension Development Host** window.
* The extension will be active in that window for testing.



---

## 🚀 Available Scripts

| Script | Description |
| --- | --- |
| `pnpm run watch` | Starts esbuild in watch mode for rapid development. |
| `pnpm run lint` | Runs ESLint and Prettier checks. |
| `pnpm run test` | Runs the full VS Code extension test suite. |
| `pnpm run test:unit` | Runs mocha unit tests (faster for logic-only changes). |
| `pnpm run compile-tests` | Compiles TypeScript test files into JavaScript. |

---

## 🛠 Project Architecture

* **`src/svn.ts`**: The core wrapper for the SVN CLI.
* **`src/blamer.ts`**: The orchestrator that manages state and VS Code events.
* **`src/decoration-manager.ts`**: Handles all visual aspects (gutter icons, inline text, hovers).
* **`_scripts/`**: Contains the SVG generator logic.

---

## 📏 Standards & Workflow

### Git Hooks

We use **Husky** and **lint-staged**. On every commit, the following will run automatically:

* ESLint (with auto-fix)
* Prettier formatting
* TypeScript type-checking (`tsc --noEmit`)

### Code Style

* **TypeScript**: Use strict typing. Avoid `any` where possible.
* **Formatting**: Handled by Prettier. Do not fight the formatter; let it do its job.
* **Logging**: Use the `logger` provided in the classes. Avoid `console.log`.

### Pull Request Process

1. Create a new branch from `main`.
2. If you've added logic, please add a corresponding test in `src/test/`.
3. Ensure `pnpm run lint` and `pnpm run test:unit` pass locally.
4. Open a PR with a clear description of the changes.

---

## 🐛 Debugging

If you encounter issues with SVN commands failing, check the **Output** channel in the Extension Development Host. Select **SVN Blamer** from the dropdown to see detailed execution logs and child process errors.
