import { BacktraceStackFrame } from '../../model/data/BacktraceStackTrace';
import { JavaScriptEngine } from '../../model/data/JavaScriptEngine';

export interface BacktraceStackTraceConverter {
    get engine(): JavaScriptEngine;
    convert(stackTrace: string, message: string): BacktraceStackFrame[];
}
