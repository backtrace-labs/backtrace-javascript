import { BacktraceAttributeProvider } from '@backtrace/sdk-core';
import { BrowserWindow } from 'electron';
import { getBrowserWindowAttributes } from './helpers/attributes';

export class AllWindowsAttributeProvider implements BacktraceAttributeProvider {
    public readonly type = 'dynamic';

    public get(): Record<string, unknown> {
        const result = {
            windows: {} as Record<string, unknown>,
        };

        for (const window of BrowserWindow.getAllWindows()) {
            result.windows[window.id] = getBrowserWindowAttributes(window);
        }

        return result;
    }
}
