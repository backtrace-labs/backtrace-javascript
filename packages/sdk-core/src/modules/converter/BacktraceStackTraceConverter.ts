import { BacktraceStackFrame } from '../../model/data/BacktraceStackTrace';
import { JavaScriptEngine } from '../../model/data/JavaScriptEngine';
import { BacktraceReport } from '../../model/report/BacktraceReport';

export interface BacktraceStackTraceConverter {
    get engine(): JavaScriptEngine;
    convert(report: BacktraceReport): BacktraceStackFrame[];
}
