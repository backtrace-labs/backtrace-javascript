import { BacktraceAttributeProvider } from './BacktraceAttributeProvider.js';

export class ClientAttributeProvider implements BacktraceAttributeProvider {
    constructor(
        private readonly _sdkName: string,
        private readonly _sdkVersion: string,
        private readonly _sessionId: string,
    ) {}

    public get type(): 'scoped' | 'dynamic' {
        return 'scoped';
    }

    public get(): Record<string, unknown> {
        return {
            'application.session': this._sessionId,
            'backtrace.agent': this._sdkName,
            'backtrace.version': this._sdkVersion,
        };
    }
}
