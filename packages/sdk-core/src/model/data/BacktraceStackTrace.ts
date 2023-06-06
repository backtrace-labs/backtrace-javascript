export interface BacktraceStackFrame {
    funcName: string;
    line?: number;
    column?: number;
    sourceCode?: string;
    library: string;
}
export interface BacktraceStackTrace {
    name: string;
    fault: boolean;
    stack: BacktraceStackFrame[];
}
