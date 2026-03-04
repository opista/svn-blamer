import { commands, window, workspace } from "vscode";

import { EXTENSION_CONFIGURATION, SVN_EXECUTABLE_PATH_KEY } from "./const/extension";

let hasWarned = false;

export function warnWorkspaceExecutablePath(): void {
    if (hasWarned) {
        return;
    }

    const inspection = workspace
        .getConfiguration(EXTENSION_CONFIGURATION)
        .inspect(SVN_EXECUTABLE_PATH_KEY);

    if (!inspection) {
        return;
    }

    const hasWorkspaceValue =
        inspection.workspaceValue !== undefined || inspection.workspaceFolderValue !== undefined;

    if (!hasWorkspaceValue) {
        return;
    }

    hasWarned = true;

    void window
        .showWarningMessage(
            `"${EXTENSION_CONFIGURATION}.${SVN_EXECUTABLE_PATH_KEY}" is set at workspace level. For security, this setting will be restricted to machine-level (User settings) in a future update. Please move this value to your User settings to avoid disruption.`,
            "Open Settings",
        )
        .then((selection) => {
            if (selection === "Open Settings") {
                void commands.executeCommand(
                    "workbench.action.openSettings",
                    `${EXTENSION_CONFIGURATION}.${SVN_EXECUTABLE_PATH_KEY}`,
                );
            }
        });
}

/**
 * @internal For testing purposes only
 */
export function resetWarningState(): void {
    hasWarned = false;
}
