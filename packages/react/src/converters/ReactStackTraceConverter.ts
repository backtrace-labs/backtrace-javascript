import { BacktraceStackTraceConverter } from '@backtrace/sdk-core';
import { JavaScriptEngine } from '@backtrace/sdk-core/src/model/data/JavaScriptEngine';
import { BacktraceStackFrame } from '@backtrace/sdk-core/lib/model/data/BacktraceStackTrace';
import { isReact16ComponentStack, parseReact16ComponentStack } from '../helpers/componentStackHelpers';

export class ReactStackTraceConverter implements BacktraceStackTraceConverter {
    constructor(private readonly stackTraceConverter: BacktraceStackTraceConverter) {}

    get engine(): JavaScriptEngine {
        return this.stackTraceConverter.engine;
    }

    public convert(stackTrace: string, message = ''): BacktraceStackFrame[] {
        // React 16 component stacks are not JS error stacks, and need to be parsed separately
        if (isReact16ComponentStack(stackTrace)) {
            return parseReact16ComponentStack(stackTrace);
        }
        return this.stackTraceConverter.convert(stackTrace, message);
    }
}
