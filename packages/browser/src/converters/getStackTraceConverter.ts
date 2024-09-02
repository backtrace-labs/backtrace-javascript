import { BacktraceStackTraceConverter, V8StackTraceConverter } from '@backtrace/sdk-core';
import { getEngine } from '../engineDetector.js';
import { JavaScriptCoreStackTraceConverter } from './JavaScriptCoreStackTraceConverter.js';
import { SpiderMonkeyStackTraceConverter } from './SpiderMonkeyStackTraceConverter.js';

export function getStackTraceConverter(): BacktraceStackTraceConverter {
    switch (getEngine()) {
        case 'JavaScriptCore': {
            return new JavaScriptCoreStackTraceConverter();
        }
        case 'SpiderMonkey': {
            return new SpiderMonkeyStackTraceConverter();
        }
        default: {
            return new V8StackTraceConverter();
        }
    }
}
