import { BacktraceAttributeProvider, IdGenerator } from '@backtrace/sdk-core';

export class UserIdentifierAttributeProvider implements BacktraceAttributeProvider {
    public readonly USER_IDENTIFIER = 'backtrace-guid';

    public get type(): 'scoped' | 'dynamic' {
        return 'scoped';
    }

    public get(): Record<string, unknown> {
        return {
            guid: this.generateUuidToLocalStorage() ?? IdGenerator.uuid(),
        };
    }

    private generateUuidToLocalStorage(): string | undefined {
        if (!window.localStorage) {
            return undefined;
        }

        try {
            let guid = window.localStorage.getItem(this.USER_IDENTIFIER);
            if (!guid) {
                guid = IdGenerator.uuid();
                window.localStorage.setItem(this.USER_IDENTIFIER, guid);
            }

            return guid;
        } catch {
            return undefined;
        }
    }
}
