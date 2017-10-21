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
                    this.setLines(revisions);
                    this.gutter();
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
    
    setLines(revisions) {
        Object.entries(revisions).forEach(([line, revision]) => {
            if (!this.images[revision]) this.images[revision] = this.randomImage();         
            decoration.set(this.editor, line, this.images[revision]);
        });
    },
    
    getFiles() {
        return new Promise((resolve) => {
            fs.readdir(`${blamer.extensionPath}\\img\\`, (err, files) => {
                this.files = files;
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

    gutter() {

    },
};

module.exports = blamer;