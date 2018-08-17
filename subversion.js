const vscode = require('vscode');
const path = require('path');
const child_process = require('child_process');
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

                console.log(stdout);
                const revision = stdout.match(/revision="(.*)">/)[1];
                const email = stdout.match(/<author>([^<]*)<\/author>/)[1];
                const message = stdout.match(/<msg>([^<]*)<\/msg>/)[1];
                let date = stdout.match(/<date>([^<]*)<\/date>/)[1];

                date = formatDate(date);
                resolve({ email, revision, date, message });        
            });
        });
    },
};

module.exports = subversion;
