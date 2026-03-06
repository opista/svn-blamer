import { commands, ExtensionContext, window, workspace } from "vscode";

import { Blamer } from "./blamer";
import { EXTENSION_NAME } from "./const/extension";
import { CredentialManager } from "./credential-manager";
import { DecorationManager } from "./decoration-manager";
import { Storage } from "./storage";
import { SVN } from "./svn";
import { DecorationRecord } from "./types/decoration-record.model";
import { debounce } from "./util/debounce";

export async function activate(context: ExtensionContext) {
    const logger = window.createOutputChannel(EXTENSION_NAME, {
        log: true,
    });
    const decorationManager = new DecorationManager();
    const storage = new Storage<DecorationRecord>();
    const credentialManager = new CredentialManager(context, logger);
    const svn = new SVN(logger, credentialManager);
    const blamer = new Blamer(logger, storage, svn, decorationManager);

    logger.clear();
    blamer.clearRecordsForAllFiles();

    logger.info("Blamer initialised");

    const clear = commands.registerCommand("blamer-vs.clearBlame", () =>
        blamer.clearBlameForActiveTextEditor(),
    );

    const show = commands.registerCommand("blamer-vs.showBlame", () =>
        blamer.showBlameForActiveTextEditor(),
    );

    const toggle = commands.registerCommand("blamer-vs.toggleBlame", () =>
        blamer.toggleBlameForActiveTextEditor(),
    );

    const clearCredentials = commands.registerCommand("blamer-vs.clearCredentials", () =>
        credentialManager.manageCredentials(),
    );

    const autoBlame = window.onDidChangeActiveTextEditor((textEditor) =>
        blamer.autoBlame(textEditor),
    );

    const clearOnClose = workspace.onDidCloseTextDocument((textDocument) =>
        blamer.handleClosedDocument(textDocument),
    );

    const updateOnChange = workspace.onDidChangeTextDocument((event) =>
        blamer.handleDocumentChange(event),
    );

    const scrollUpdate = window.onDidChangeTextEditorVisibleRanges(
        debounce((event) => blamer.handleVisibleRangesChange(event), 50),
    );

    const trackLine = window.onDidChangeTextEditorSelection(
        debounce((event) => blamer.trackLine(event)),
    );

    context.subscriptions.push(clear);
    context.subscriptions.push(show);
    context.subscriptions.push(toggle);
    context.subscriptions.push(trackLine);
    context.subscriptions.push(clearOnClose);
    context.subscriptions.push(updateOnChange);
    context.subscriptions.push(scrollUpdate);
    context.subscriptions.push(autoBlame);
    context.subscriptions.push(clearCredentials);
    context.subscriptions.push(logger);
    context.subscriptions.push(blamer);
}

export function deactivate() {}
