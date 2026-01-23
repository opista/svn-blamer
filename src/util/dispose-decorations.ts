import { TextEditorDecorationType } from "vscode";

export const disposeDecorations = async (decorations: TextEditorDecorationType[]): Promise<void> => {
    const chunkSize = 100;
    for (let i = 0; i < decorations.length; i += chunkSize) {
        const chunk = decorations.slice(i, i + chunkSize);
        chunk.forEach((decoration) => decoration?.dispose());
        await new Promise((resolve) => setTimeout(resolve, 10));
    }
};
