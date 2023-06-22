import { JavaScriptEngine } from '@backtrace/sdk-core/lib/model/data/JavaScriptEngine';

export function getEngine(): JavaScriptEngine {
    const normalizedUserAgent = navigator.userAgent.toLowerCase();

    if (normalizedUserAgent.includes('firefox')) {
        return 'SpiderMonkey';
    }

    if (normalizedUserAgent.includes('safari') && !normalizedUserAgent.includes('chrome')) {
        return 'JavaScriptCore';
    }

    return 'v8';
}
