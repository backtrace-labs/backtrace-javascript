import { JavaScriptEngine } from '@backtrace/sdk-core/src/model/data/JavaScriptEngine';

export function getEngine(): JavaScriptEngine {
    if (navigator.vendor.toLowerCase().includes('apple')) {
        return 'JavaScriptCore';
    }

    if (navigator.userAgent.toLowerCase().includes('firefox')) {
        return 'SpiderMonkey';
    }

    return 'v8';
}
