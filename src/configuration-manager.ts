import { Disposable, workspace } from "vscode";

import { EXTENSION_CONFIGURATION } from "./const/extension";
import { IConfiguration } from "./types/configuration.model";

export class ConfigurationManager implements Disposable {
    private _config: IConfiguration;
    private _disposable: Disposable;

    constructor() {
        this._config = this.loadConfig();
        this._disposable = workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(EXTENSION_CONFIGURATION)) {
                this._config = this.loadConfig();
            }
        });
    }

    private loadConfig(): IConfiguration {
        const config = workspace.getConfiguration(EXTENSION_CONFIGURATION);
        return {
            autoBlame: config.get<boolean>("autoBlame", false),
            enableLogs: config.get<boolean>("enableLogs", true),
            enableVisualIndicators: config.get<boolean>("enableVisualIndicators", true),
            viewportBuffer: config.get<number>("viewportBuffer", 200),
            svnExecutablePath: config.get<string>("svnExecutablePath", "svn"),
        };
    }

    public get config(): IConfiguration {
        return this._config;
    }

    public dispose() {
        this._disposable.dispose();
    }
}
