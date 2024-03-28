export interface BacktraceStackFrame {
    funcName: string;
    line?: number;
    column?: number;
    sourceCode?: string;
    library: string;
    debug_identifier?: string;
    variables?: BacktraceStackFrameValue[];
}
export interface BacktraceStackFrameValue {
    type: string;
    name: string;
    value: unknown;
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
