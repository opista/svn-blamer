const vscode = require('vscode');

const decoration = {

    set(editor, line, image) {
        const path = vscode.extensions.getExtension('beaugust.blamer-vs').extensionPath;
        const decoration = vscode.window.createTextEditorDecorationType({
            gutterIconPath: `${path}\\img\\${image}`,
            gutterIconSize: 'contain'
        });

        editor.setDecorations(decoration, [new vscode.Range(line,0,line,0)]);
    },
};

module.exports = decoration;