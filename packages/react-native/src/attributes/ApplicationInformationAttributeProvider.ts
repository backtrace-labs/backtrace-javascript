import { type BacktraceAttributeProvider } from '@backtrace-labs/sdk-core';
import { NativeModules } from 'react-native';

export class ApplicationInformationAttributeProvider implements BacktraceAttributeProvider {
    public get type(): 'scoped' | 'dynamic' {
        return 'scoped';
    }
    public get(): Record<string, unknown> {
        const attributeProvider = NativeModules.BacktraceApplicationAttributeProvider;
        if (!attributeProvider) {
            return {};
        }

        return {
            application: attributeProvider.readApplicationName(),
            'application.version': attributeProvider.readApplicationVersion(),
        };
    }
}
