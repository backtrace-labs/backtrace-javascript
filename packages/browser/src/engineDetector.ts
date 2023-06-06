import { JavaScriptEngine } from '@backtrace/sdk-core/src/model/data/JavaScriptEngine';

export function getEngine(): JavaScriptEngine {
    if (navigator.userAgent.includes('Firefox')) {
        return 'firefox';
    }
    if (navigator.userAgent.includes('Safari')) {
        return 'safari';
    }

    return 'v8';
}
