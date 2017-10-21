const vscode = require('vscode');

const decoration = {
    icons: [],

    set(editor, line, image) {
        const path = vscode.extensions.getExtension('beaugust.blamer-vs').extensionPath;
        const icon = vscode.window.createTextEditorDecorationType({
            gutterIconPath: `${path}\\img\\${image}`,
            gutterIconSize: 'contain'
        });
        this.icons.push(icon);
        editor.setDecorations(icon, [new vscode.Range(parseInt(line),0,parseInt(line),0)]);
    },

    destroy() {
        if (!this.icons.length) return;
        this.icons.forEach((icon) => {
            icon.dispose();
        });
    }
};

module.exports = decoration;