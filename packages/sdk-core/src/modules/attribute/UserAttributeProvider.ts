import { BacktraceAttributeProvider } from './BacktraceAttributeProvider';

export class UserAttributeProvider implements BacktraceAttributeProvider {
    constructor(private readonly _source: Record<string, unknown> | (() => Record<string, unknown>)) {}

    public get type(): 'scoped' | 'dynamic' {
        return typeof this._source === 'function' ? 'dynamic' : 'scoped';
    }

    public get(): Record<string, unknown> {
        if (typeof this._source === 'function') {
            try {
                return this._source();
            } catch {
                return {};
            }
        }

        return this._source;
    }
}
