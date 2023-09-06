import { type BacktraceAttributeProvider } from '@backtrace-labs/sdk-core';
import { NativeModules } from 'react-native';

export class ApplicationInformationAttributeProvider implements BacktraceAttributeProvider {
    public get type(): 'scoped' | 'dynamic' {
        return 'scoped';
    }
    public get(): Record<string, unknown> {
        if (!NativeModules.BacktraceApplicationAttributeProvider) {
            return {};
        }
        const BacktraceApplicationAttributeProvider = NativeModules.BacktraceApplicationAttributeProvider;

        return {
            application: BacktraceApplicationAttributeProvider.readApplicationName(),
            'application.version': BacktraceApplicationAttributeProvider.readApplicationVersion(),
        };
    }
}
