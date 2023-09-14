import { type BacktraceAttributeProvider } from '@backtrace-labs/sdk-core';
import { NativeModules } from 'react-native';

export class CpuAttributeProvider implements BacktraceAttributeProvider {
    public get type(): 'scoped' | 'dynamic' {
        return 'dynamic';
    }
    public get(): Record<string, unknown> {
        const attributeProvider = NativeModules.BacktraceCpuAttributeProvider;
        if (!attributeProvider) {
            return {};
        }
        return attributeProvider.readMemoryUsage();
    }
}
