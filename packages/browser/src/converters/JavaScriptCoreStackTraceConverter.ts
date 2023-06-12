import { BacktraceReport, BacktraceStackTraceConverter } from '@backtrace/sdk-core';
import { BacktraceStackFrame } from '@backtrace/sdk-core/src/model/data/BacktraceStackTrace';
import { JavaScriptEngine } from '@backtrace/sdk-core/src/model/data/JavaScriptEngine';

export class JavaScriptCoreStackTraceConverter implements BacktraceStackTraceConverter {
    public readonly UNKNOWN_FRAME = 'unknown';
    public readonly ANONYMOUS_FUNCTION = 'anonymous';

    get engine(): JavaScriptEngine {
        return 'JavaScriptCore';
    }

    public convert(report: BacktraceReport): BacktraceStackFrame[] {
        const result: BacktraceStackFrame[] = [];
        if (!report.stackTrace) {
            return result;
        }
        const stackFrames = report.stackTrace.split('\n');

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
            functionSeparatorIndex === -1 ? this.ANONYMOUS_FUNCTION : stackFrame.substring(0, functionSeparatorIndex);

        if (!functionName) {
            functionName = this.ANONYMOUS_FUNCTION;
        }

        const sourceCodeInformation = stackFrame.substring(functionSeparatorIndex + 1);

        const sourceCodeParts = sourceCodeInformation.split(':');
        if (sourceCodeParts.length === 1) {
            return {
                funcName: functionName,
                library: sourceCodeInformation ? sourceCodeInformation : this.UNKNOWN_FRAME,
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
