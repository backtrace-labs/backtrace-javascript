import { BacktraceStackFrame } from '../../model/data/BacktraceStackTrace.js';
import { JavaScriptEngine } from '../../model/data/JavaScriptEngine.js';

export interface BacktraceStackTraceConverter {
    get engine(): JavaScriptEngine;
    convert(stackTrace: string, message: string): BacktraceStackFrame[];
}
