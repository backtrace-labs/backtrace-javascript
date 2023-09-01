import { type BacktraceAttributeProvider } from '@backtrace-labs/sdk-core';
import { getApplicationName, getUniqueIdSync, getVersion } from 'react-native-device-info';
export class ApplicationInformationAttributeProvider implements BacktraceAttributeProvider {
    public readonly APPLICATION_ATTRIBUTE = 'application';
    public readonly APPLICATION_VERSION_ATTRIBUTE = 'application.version';
    public readonly USER_ID = 'guid';

    public get type(): 'scoped' | 'dynamic' {
        return 'scoped';
    }
    public get(): Record<string, unknown> {
        return {
            [this.APPLICATION_ATTRIBUTE]: getApplicationName(),
            [this.APPLICATION_VERSION_ATTRIBUTE]: getVersion(),
            ['guid']: getUniqueIdSync(),
        };
    }
}
