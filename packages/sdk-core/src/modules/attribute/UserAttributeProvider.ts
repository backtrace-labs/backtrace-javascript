import { BacktraceAttributeProvider } from './BacktraceAttributeProvider';

export class UserAttributeProvider implements BacktraceAttributeProvider {
    public readonly type: 'scoped' | 'dynamic';
    private readonly _source: () => Record<string, unknown>;

    constructor(source: Record<string, unknown> | (() => Record<string, unknown>)) {
        this._source = typeof source === 'function' ? source : () => source;
        this.type = typeof source === 'function' ? 'dynamic' : 'scoped';
    }

    public get(): Record<string, unknown> {
        return this._source();
    }
}
