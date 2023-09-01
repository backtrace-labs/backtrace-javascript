import { type BacktraceAttributeProvider } from '@backtrace-labs/sdk-core';
import { getBaseOsSync, getBrand, getSystemVersion } from 'react-native-device-info';
export class DeviceAttributeProvider implements BacktraceAttributeProvider {
    public get type(): 'scoped' | 'dynamic' {
        return 'scoped';
    }

    public get(): Record<string, unknown> {
        return {
            'device.model': getBrand(),
            'uname.sysname': getBaseOsSync(),
            'uname.version': getSystemVersion(),
        };
    }
}
