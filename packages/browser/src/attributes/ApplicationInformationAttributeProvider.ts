import { BacktraceAttributeProvider } from '@backtrace-labs/sdk-core';
import { BacktraceConfiguration } from '../BacktraceConfiguration';

export class ApplicationInformationAttributeProvider implements BacktraceAttributeProvider {
    public readonly APPLICATION_ATTRIBUTE = 'application';
    public readonly APPLICATION_VERSION_ATTRIBUTE = 'application.version';

    private readonly _application: string;
    private readonly _applicationVersion: string;

    public get type(): 'scoped' | 'dynamic' {
        return 'scoped';
    }

    constructor(options: BacktraceConfiguration) {
        this._application = options.name;
        this._applicationVersion = options.version;

        if (!this._application || !this._applicationVersion) {
            throw new Error('Missing application/application version information!');
        }
    }
    public get(): Record<string, unknown> {
        return {
            [this.APPLICATION_ATTRIBUTE]: this._application,
            [this.APPLICATION_VERSION_ATTRIBUTE]: this._applicationVersion,
        };
    }
}
