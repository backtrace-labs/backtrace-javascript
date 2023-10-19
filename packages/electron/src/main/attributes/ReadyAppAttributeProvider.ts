import { BacktraceAttributeProvider } from '@backtrace-labs/sdk-core';
import { app } from 'electron';

interface LocaleFunctions {
    getLocale?(): string;
    getSystemLocale?(): string;
    getPreferredSystemLanguages?(): string;
}

/**
 * Attributes from this provider can only be resolved after the Electron app is ready.
 */
export class ReadyAppAttributeProvider implements BacktraceAttributeProvider {
    private _attributes?: Record<string, unknown>;

    public readonly type: 'scoped' | 'dynamic';

    constructor() {
        if (app.isReady()) {
            this.type = 'scoped';
            this._attributes = this.buildAttributes();
        } else {
            this.type = 'dynamic';
            app.on('ready', () => (this._attributes = this.buildAttributes()));
        }
    }

    public get(): Record<string, unknown> {
        return this._attributes ?? {};
    }

    private buildAttributes() {
        const localeFns = app as LocaleFunctions;

        return {
            language: localeFns.getLocale && localeFns.getLocale(),
            'system.language': localeFns.getSystemLocale && localeFns.getSystemLocale(),
        };
    }
}
