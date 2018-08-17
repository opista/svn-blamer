const vscode = require('vscode');

const decoration = {
    icons: [],

    set(editor, line, commit) {
        const path = vscode.extensions.getExtension('beaugust.blamer-vs').extensionPath;
        const icon = vscode.window.createTextEditorDecorationType({
            gutterIconPath: `${path}/img/${commit.image}`,
            gutterIconSize: 'contain'
        });
        this.icons.push(icon);
        editor.setDecorations(
            icon,
            [{
                range: new vscode.Range(parseInt(line),0,parseInt(line),1000),
                hoverMessage: new vscode.MarkdownString(`${commit.revision}: ${commit.email}\n\n${commit.date}\n\n${commit.message}`)
            }]
        );
    },


    destroy() {
        if (!this.icons.length) return;
        this.icons.forEach((icon) => {
            icon.dispose();
        });
    }
};

module.exports = decoration;
