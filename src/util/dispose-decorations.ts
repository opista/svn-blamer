import { TextEditorDecorationType } from "vscode";

export const disposeDecorations = (decorations: TextEditorDecorationType[]): void => {
    decorations.forEach((decoration) => decoration.dispose());
};
