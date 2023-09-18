import { type BacktraceAttributeProvider } from '@backtrace-labs/sdk-core';
import { NativeModules, Platform } from 'react-native';

export class SystemAttributeProvider implements BacktraceAttributeProvider {
    public get type(): 'scoped' | 'dynamic' {
        return 'scoped';
    }

    public get(): Record<string, unknown> {
        const attributeProvider = NativeModules.BacktraceSystemAttributeProvider;
        if (!attributeProvider) {
            return {};
        }

        return {
            guid: attributeProvider.readMachineId(),
            'uname.machine': attributeProvider.readSystemArchitecture(),
            'uname.sysname': Platform.OS,
            'uname.version': attributeProvider.readSystemVersion(),
        };
    }
}
