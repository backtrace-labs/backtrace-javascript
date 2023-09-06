import { type BacktraceAttributeProvider } from '@backtrace-labs/sdk-core';
import { NativeModules } from 'react-native';

export class SystemAttributeProvider implements BacktraceAttributeProvider {
    public get type(): 'scoped' | 'dynamic' {
        return 'scoped';
    }

    public get(): Record<string, unknown> {
        if (!NativeModules.BacktraceSystemAttributeProvider) {
            return {};
        }
        const BacktraceSystemAttributeProvider = NativeModules.BacktraceSystemAttributeProvider;

        return {
            guid: BacktraceSystemAttributeProvider.readMachineId(),
            'uname.machine': BacktraceSystemAttributeProvider.readSystemArchitecture(),
            'uname.sysname': 'Android',
            'uname.version': BacktraceSystemAttributeProvider.readSystemRelease(),
            'device.os_version': BacktraceSystemAttributeProvider.readSystemVersion(),
        };
    }
}
