import { BacktraceAttributeProvider, BacktraceConfiguration, IdGenerator } from '@backtrace/sdk-core';

export class UserIdentifierAttributeProvider implements BacktraceAttributeProvider {
    private readonly USER_IDENTIFIER = 'backtrace-guid';
    private _guid: string | undefined;

    constructor(options: BacktraceConfiguration) {
        this._guid = options.userAttributes?.['guid'] as string;
    }

    public get type(): 'scoped' | 'dynamic' {
        return 'scoped';
    }
    public get(): Record<string, unknown> {
        if (!this._guid) {
            let guid = window.localStorage.getItem(this.USER_IDENTIFIER);
            if (!guid) {
                guid = IdGenerator.uuid();
                window.localStorage.setItem(this.USER_IDENTIFIER, guid);
            }
            this._guid = guid;
        }

        return {
            guid: this._guid,
        };
    }
}
