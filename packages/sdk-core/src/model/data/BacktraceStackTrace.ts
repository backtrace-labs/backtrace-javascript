export interface BacktraceStackFrame {
    funcName: string;
    line?: number;
    column?: number;
    sourceCode?: string;
    library: string;
    debug_identifier?: string;
    symbolication_source?: string;
}

/**
 * Backtrace Stack Trace object definition.
 * For more info visit: https://api.backtrace.io
 */
export interface BacktraceStackTrace {
    name: string;
    fault: boolean;
    stack: BacktraceStackFrame[];
}
