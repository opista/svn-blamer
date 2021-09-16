const vscode = require("vscode");
const path = require("path");
const child_process = require("child_process");
const formatDate = require("./functions/formatDate");
const parser = require("fast-xml-parser");

const subversion = {
  path: "",
  name: "",
  revisions: [],

  init(editor) {
    this.destroy();
    this.path = editor.document.fileName.replace(/\$/g, "\\$");
    this.name = path.basename(this.path);

    if (this.path === this.name)
      return vscode.window.showInformationMessage(
        "SVN Blamer: Cannot identify file"
      );
    return this.blame();
  },

  destroy() {
    this.path = "";
    this.name = "";
    this.revisions = {};
  },

  blame() {
    return new Promise((resolve, reject) => {
      const script = `svn blame -x "-w --ignore-eol-style" --xml "${this.path}"`;
      const process = child_process.spawn(script, { shell: true });

      let [stdout, stderr] = ["", ""];
      process.stderr.on("data", (data) => {
        stderr += data.toString();
      });
      process.stdout.on("data", (data) => {
        stdout += data.toString();
      });
      process.stdout.on("close", (code) => {
        if (stderr || code) {
          reject(stderr);
        } else {
          if (parser.validate(stdout) === true)
            resolve(
              this.getRevisions(
                parser.parse(stdout, {
                  ignoreAttributes: false,
                  parseAttributeValue: true,
                })
              )
            );
          else reject("SVN Error: Invalid XML");
        }
      });
    });
  },

  getRevisions(data) {
    this.revisions = data.blame.target.entry.map(({ commit }) => {
      const revision = commit["@_revision"];
      const date = formatDate(commit.date);
      let rev = { ...commit };
      delete rev["@_revision"];
      delete rev["date"];
      return {
        ...rev,
        revision,
        date,
      };
    });

    return this.revisions;
  },

  getLog(revision) {
    if (Object.keys(this.revisions).length === 0) return;

    return new Promise((resolve, reject) => {
      const { enableDetail } = vscode.workspace.getConfiguration("svn-gutter");
      if (!enableDetail)
        return resolve(
          this.revisions.find((commit) => commit?.revision === revision)
        );

      const script = `svn log -r${revision} "${this.path}" --xml`;
      const process = child_process.spawn(script, { shell: true });

      let [stdout, stderr] = ["", ""];
      process.stderr.on("data", (data) => (stderr += data.toString()));
      process.stdout.on("data", (data) => (stdout += data.toString()));
      process.stdout.on("close", (code) => {
        if (stderr || code) {
          reject(stderr);
        } else {
          let commitX = {};
          if (parser.validate(stdout) === true) {
            const commit = parser.parse(stdout, {
              ignoreAttributes: false,
              parseAttributeValue: true,
            }).log.logentry;
            const revision = commit["@_revision"];
            const date = formatDate(commit.date);
            let rev = { ...commit };
            delete rev["@_revision"];
            delete rev["date"];
            resolve({
              ...rev,
              revision,
              date,
            });
          } else reject(`SVN Error: Invalid XML rev${revision}`);
        }
      });
    });
  },
};

module.exports = subversion;
