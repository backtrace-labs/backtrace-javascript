import { BacktraceAttributeProvider } from '@backtrace-labs/sdk-core';

export class WindowAttributeProvider implements BacktraceAttributeProvider {
    public get type(): 'scoped' | 'dynamic' {
        return 'dynamic';
    }
    public get(): Record<string, unknown> {
        return {
            'window.innerHeight': window.innerHeight,
            'window.innerWidth': window.innerWidth,
            'window.outerHeight': window.outerHeight,
            'window.outerWidth': window.outerWidth,
            'window.pageXOffset': window.pageXOffset,
            'window.pageYOffset': window.pageYOffset,
            'window.screenX': window.screenX,
            'window.screenY': window.screenY,
            'window.screenLeft': window.screenLeft,
            'window.screenTop': window.screenTop,
        };
    }
}
