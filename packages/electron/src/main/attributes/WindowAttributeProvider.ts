import { BacktraceAttributeProvider } from '@backtrace/sdk-core';
import { BrowserWindow } from 'electron';
import { flatten, getBasicBrowserWindowAttributes } from './helpers/attributes';

export interface WindowAttributeProviderOptions {
    /**
     * Key name to use. If not provided, the window ID will be used.
     *
     * The keys will take form of `electron.window.${key}.*`.
     */
    readonly key?: string;

    /**
     * If `true`, destroyed windows will not add any information. Default: `true`.
     */
    readonly includeDestroyed?: boolean;
}

export class WindowAttributeProvider implements BacktraceAttributeProvider {
    constructor(
        private readonly _window: BrowserWindow,
        private readonly _options?: WindowAttributeProviderOptions,
    ) {}

    public readonly type = 'dynamic';

    public get(): Record<string, unknown> {
        const { key, includeDestroyed } = this._options ?? {};

        if (!includeDestroyed && this._window.isDestroyed()) {
            return {};
        }

        return flatten(getBasicBrowserWindowAttributes(this._window), `window.${key ?? this._window.id}`);
    }
}
