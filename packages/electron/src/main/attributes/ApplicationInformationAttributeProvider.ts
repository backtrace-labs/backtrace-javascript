import { BacktraceAttributeProvider } from '@backtrace-labs/sdk-core';
import { app } from 'electron';

export class ApplicationInformationAttributeProvider implements BacktraceAttributeProvider {
    public readonly APPLICATION_ATTRIBUTE = 'application';
    public readonly APPLICATION_VERSION_ATTRIBUTE = 'application.version';

    private readonly _application: string;
    private readonly _applicationVersion: string;

    public get type(): 'scoped' | 'dynamic' {
        return 'scoped';
    }

    constructor() {
        this._application = app.getName();
        this._applicationVersion = app.getVersion();
    }

    public get(): Record<string, unknown> {
        return {
            [this.APPLICATION_ATTRIBUTE]: this._application,
            [this.APPLICATION_VERSION_ATTRIBUTE]: this._applicationVersion,
            'electron.process': 'main',
        };
    }
}
