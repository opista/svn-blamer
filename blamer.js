const vscode = require('vscode');
const fs = require('fs');

const decoration = require('./decoration');
const subversion = require('./subversion');

const blamer = {
    editor: '',
    extensionPath: '',
    files: [],
    images: {},

    init() {
        this.destroy();
        this.editor = vscode.window.activeTextEditor;
        this.extensionPath = vscode.extensions.getExtension('beaugust.blamer-vs').extensionPath;
        
        subversion.init(this.editor)
            .then((revisions) => {
                this.getFiles()
                .then(() => {
                    this.findUniques(revisions)
                        .then(() => {
                            this.setLines(revisions);
                        });
                })
                .catch((err) => {
                    console.log(err);
                })
            })
    },   
        
    destroy() { 
        subversion.destroy();
        decoration.destroy();
        this.editor = '';
        this.extensionPath = '';
        this.files = [];
        this.images = {};
    },

    findUniques(revisions) {
        return new Promise((resolve) => {
            const uniques = Object.values(revisions).reduce((x,  y) => x.includes(y) ? x : [...x, y], []);
            const promises = [];

            uniques.forEach((unique) => {
                promises.push(new Promise((resolve) => {
                    subversion.getLog(unique)
                        .then((commit) => {
                            this.images[unique] = {
                                image: this.randomImage(),
                                revision: commit.revision,
                                email: commit.email,
                                date: commit.date,
                                message: commit.message,  
                            }
                            resolve();
                        })
                        .catch((err) => {
                            console.log(err);
                        })
                }))

            });

            Promise.all(promises)
                .then(() => {
                    resolve();
                });
        });
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
};

module.exports = blamer;
