const vscode = require('vscode');
const path = require('path');
const child_process = require('child_process');
const parseString = require('xml2js').parseString;
const formatDate = require('./functions/formatDate');

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
            const script = `svn log -r${revision} "${this.path}" --xml`;
            child_process.exec(script, (error, stdout, stderr) => {
                if (error) return vscode.window.showErrorMessage(stderr);

                parseString(stdout, (err, result) => {
                    const data = result.log.logentry[0];
                    const email = data.author[0];
                    const date = formatDate(data.date[0]);
                    const message = data.msg[0];
                    resolve({ email, date, message });
                });         
            });
        });
    },
};

module.exports = subversion;
