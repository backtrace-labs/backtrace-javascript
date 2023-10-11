import { BacktraceStackTraceConverter, V8StackTraceConverter } from '@backtrace-labs/sdk-core';
import { getEngine } from '../engineDetector';
import { JavaScriptCoreStackTraceConverter } from './JavaScriptCoreStackTraceConverter';
import { SpiderMonkeyStackTraceConverter } from './SpiderMonkeyStackTraceConverter';

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
