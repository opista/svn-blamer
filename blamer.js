const vscode = require('vscode');
const fs = require('fs');

const decoration = require('./decoration');
const subversion = require('./subversion');

const blamer = {
    editor: '',
    extensionPath: '',
    files: [],
    images: {},
    statusBarItem: undefined,
    uniqueCommits: [],

    init() {
        this.destroy();
        this.editor = vscode.window.activeTextEditor;
        this.extensionPath = vscode.extensions.getExtension('beaugust.blamer-vs').extensionPath;
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);

        this.updateStatusBar('Blamer Started');

        subversion.init(this.editor)
            .then((revisions) => {
                this.updateStatusBar(`Preparing ${subversion.name}`);
                this.getFiles().then(() => {
                    this.findUniques(revisions)
                        .then(() => {
                            this.updateStatusBar(`Processing complete`);
                            this.setLines(revisions);
                            this.statusBarItem.dispose();
                        })
                        .catch(error => this.handleError(error));
                })
            }).catch((error) => this.handleError(error));
    },

    destroy() {
        subversion.destroy();
        decoration.destroy();
        this.editor = '';
        this.extensionPath = '';
        this.files = [];
        this.images = {};
        if (this.statusBarItem) {
            this.statusBarItem.dispose();
        }
    },

    findUniques(revisions) {
        this.uniqueCommits = Object.values(revisions).reduce((x,  y) => x.includes(y) ? x : [...x, y], []);

        const promises = this.uniqueCommits.map((unique) => subversion.getLog(unique)
            .then((commit) => {
                this.updateStatusBar(`Processing revision ${commit.revision}`);
                this.images[unique] = {
                    image: this.randomImage(),
                    revision: commit.revision || '',
                    author: commit.author || '',
                    date: commit.date || '',
                    message: commit.message || '',
                }
            })
            .catch(error => this.handleError(error))
        );

        return Promise.all(promises);
    },

    setLines(revisions) {
        Object.entries(revisions).forEach(([line, revision]) => {
            decoration.set(this.editor, line, this.images[revision]);
        });
    },

    getFiles() {
        return new Promise((resolve) => {
            fs.readdir(`${blamer.extensionPath}/img`, (err, files) => {
                this.files = files || [];
                resolve();
            });
        })
    },

    randomImage() {
        const length = this.files.length;
        const index = Math.floor(Math.random() * length);
        const image = this.files[index];
        this.files.splice(index, 1);
        return image;
    },

    updateStatusBar(text) {
        if (text) {
            this.statusBarItem.text = `$(versions) ${text}`;
            this.statusBarItem.show();
        } else {
            this.statusBarItem.hide();
        }
    },

    handleError(error) {
        this.updateStatusBar(`Error`);
        vscode.window.showErrorMessage(error);
        console.error('Error: ', error);
    }
};

module.exports = blamer;
