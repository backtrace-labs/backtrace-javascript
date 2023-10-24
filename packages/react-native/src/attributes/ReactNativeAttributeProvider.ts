import { type BacktraceAttributeProvider } from '@backtrace/sdk-core';
import { Platform } from 'react-native';
import { hermes } from '../common/hermesHelper';

export class ReactNativeAttributeProvider implements BacktraceAttributeProvider {
    public get type(): 'scoped' | 'dynamic' {
        return 'scoped';
    }
    public get(): Record<string, unknown> {
        const hermesInstance = hermes();
        return {
            platform: hermesInstance ? 'Hermes' : 'JavaScriptCore',
            promise: !!hermesInstance?.hasPromise,
            isTesting: Platform.isTesting,
            isTv: Platform.isTV,
            constants: Platform.constants,
        };
    }
}
