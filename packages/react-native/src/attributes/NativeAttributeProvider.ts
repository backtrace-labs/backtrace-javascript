import { type AttributeType, type BacktraceAttributeProvider } from '@backtrace-labs/sdk-core';
import { NativeModules } from 'react-native';
export class NativeAttributeProvider implements BacktraceAttributeProvider {
    public get type(): 'scoped' | 'dynamic' {
        return this._type;
    }
    private readonly _provider: { get(): Record<string, AttributeType> };

    constructor(private readonly _name: string, private readonly _type: 'scoped' | 'dynamic') {
        this._provider = NativeModules?.[this._name];
    }

    public get(): Record<string, unknown> {
        if (!this._provider) {
            return {};
        }
        return this._provider.get();
    }
}
