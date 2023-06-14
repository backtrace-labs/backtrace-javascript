import { BacktraceAttributeProvider } from './BacktraceAttributeProvider';

export class ClientAttributeProvider implements BacktraceAttributeProvider {
    constructor(
        private readonly _sdkVersion: string,
        private readonly _sessionId: string,
        private readonly _userAttributes: Record<string, unknown>,
    ) {}
    public get type(): 'scoped' | 'dynamic' {
        return 'scoped';
    }
    public get(): Record<string, unknown> {
        return {
            'application.session': this._sessionId,
            'backtrace.version': this._sdkVersion,
            ...this._userAttributes,
        };
    }
}
