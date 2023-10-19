import { BacktraceAttributeProvider } from '@backtrace-labs/sdk-core';
import { app } from 'electron';

interface LocaleFunctions {
    getPreferredSystemLanguages?(): string[];
}

export class AppAttributeProvider implements BacktraceAttributeProvider {
    public readonly type = 'scoped';

    public get(): Record<string, unknown> {
        const localeFns = app as LocaleFunctions;

        return {
            'electron.appMetrics': app.getAppMetrics(),
            'system.languages': localeFns.getPreferredSystemLanguages && localeFns.getPreferredSystemLanguages(),
        };
    }
}
