import {
    ANONYMOUS_FUNCTION,
    BacktraceStackFrame,
    BacktraceStackTraceConverter,
    JavaScriptEngine,
    UNKNOWN_FRAME,
} from '@backtrace/sdk-core';

export class JavaScriptCoreStackTraceConverter implements BacktraceStackTraceConverter {
    get engine(): JavaScriptEngine {
        return 'JavaScriptCore';
    }

    public convert(stackTrace: string): BacktraceStackFrame[] {
        const result: BacktraceStackFrame[] = [];
        const stackFrames = stackTrace.split('\n');

        for (const stackFrame of stackFrames) {
            const normalizedStackFrame = stackFrame.trim();
            const frame = this.parseFrame(normalizedStackFrame);
            result.push(frame);
        }

        return result;
    }

    private parseFrame(stackFrame: string): BacktraceStackFrame {
        const functionSeparatorIndex = this.generateSeparatorIndex(stackFrame);
        let functionName =
            functionSeparatorIndex === -1 ? ANONYMOUS_FUNCTION : stackFrame.substring(0, functionSeparatorIndex);

        if (!functionName) {
            functionName = ANONYMOUS_FUNCTION;
        }

        const sourceCodeInformation = stackFrame.substring(functionSeparatorIndex + 1);

        const sourceCodeParts = sourceCodeInformation.split(':');
        if (sourceCodeParts.length === 1) {
            return {
                funcName: functionName,
                library: sourceCodeInformation ? sourceCodeInformation : UNKNOWN_FRAME,
            };
        }

        const column = parseInt(sourceCodeParts[sourceCodeParts.length - 1]);
        const line = parseInt(sourceCodeParts[sourceCodeParts.length - 2]);
        const library = sourceCodeParts.slice(0, sourceCodeParts.length - 2).join(':');
        return {
            funcName: functionName,
            column: isNaN(column) ? undefined : column,
            line: isNaN(line) ? undefined : line,
            library: library,
        };
    }

    private generateSeparatorIndex(stackFrame: string): number {
        const functionSeparator = '@';
        const functionSeparatorIndex = stackFrame.indexOf(functionSeparator);
        if (functionSeparatorIndex === -1) {
            return functionSeparatorIndex;
        }
        const isMoreSeparators = stackFrame.lastIndexOf(functionSeparator) !== functionSeparatorIndex;
        if (!isMoreSeparators) {
            return functionSeparatorIndex;
        }

        const possibleSeparators = ['@http', '@file'];
        for (const possibleSeparator of possibleSeparators) {
            const possibleSeparatorIndex = stackFrame.indexOf(possibleSeparator);
            if (possibleSeparatorIndex !== -1) {
                return possibleSeparatorIndex;
            }
        }
        // we can't determinate the separator
        return functionSeparatorIndex;
    }
}
