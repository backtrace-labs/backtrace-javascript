import { JavaScriptEngine } from '@backtrace-labs/sdk-core/lib/model/data/JavaScriptEngine';

export function getEngine(): JavaScriptEngine {
    if (!navigator.userAgent) {
        return 'v8';
    }
    const normalizedUserAgent = navigator.userAgent.toLowerCase();

    if (normalizedUserAgent.includes('firefox')) {
        return 'SpiderMonkey';
    }

    if (normalizedUserAgent.includes('safari') && !normalizedUserAgent.includes('chrome')) {
        return 'JavaScriptCore';
    }

    return 'v8';
}
