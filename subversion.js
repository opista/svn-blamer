const vscode = require('vscode');
const path = require('path');
const child_process = require('child_process');

const subversion = {
    path: '',
    name: '',
    revisions: {},

    init(editor) {
        this.destroy();
        return new Promise((resolve) => {
            this.path = editor.document.fileName;
            this.name = path.basename(this.path);

            if (this.path === this.name) return vscode.window.showInformationMessage('Blamer: Cannot identify file');
            this.blame()
                .then(() => {
                    resolve(this.revisions);
                });
        });
    },

    destroy() {
        this.path = '';
        this.name = '';
        this.revisions = {};
    },

    blame() {
        return new Promise((resolve) => {
            const script = `svn blame -x "-w --ignore-eol-style" "${this.path}"`;
            child_process.exec(script, (error, stdout, stderr) => {
                if (error) return vscode.window.showErrorMessage(stderr);
                const revisions = this.getRevisions(stdout);
                resolve(revisions);
            });
        })
    },

    getRevisions(data) {
        const lines = data.split(/\n/);

        lines.forEach((line, index) => {
            if (line.substring(5, 6) === '-') return;
            const revision = line.split(' ').filter(s => s)[0];
            if (revision) this.revisions[index] = parseInt(revision);
        });
    },

    getLog(revision) {
        if (Object.keys(this.revisions).length === 0) return;
        return new Promise((resolve) => {
            const script = `svn log -r${revision} "${this.path}"`;
            child_process.exec(script, (error, stdout, stderr) => {
                if (error) vscode.window.showErrorMessage(stderr);
                else {
                    const log = (stdout).split(/\n/);
                    const email = log[1].split(" | ")[1];
                    const date = log[1].match(/[^()]+(?=\))/)[0];
                    const message = log.slice(3, -2);
                    resolve({ email, date, message });
                }
            });
        });
    },
};

module.exports = subversion;
