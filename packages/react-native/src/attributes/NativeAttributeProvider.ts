import { type AttributeType, type BacktraceAttributeProvider } from '@backtrace/sdk-core';
import { NativeModules } from 'react-native';
export class NativeAttributeProvider implements BacktraceAttributeProvider {
    private readonly _provider: { get(): Record<string, AttributeType> };

    constructor(
        private readonly _name: string,
        public readonly type: 'scoped' | 'dynamic',
    ) {
        this._provider = NativeModules?.[this._name];
    }

    public get(): Record<string, unknown> {
        if (!this._provider) {
            return {};
        }
        return this._provider.get();
    }
}
