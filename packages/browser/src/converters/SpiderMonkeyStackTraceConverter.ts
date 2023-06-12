import { BacktraceReport, BacktraceStackTraceConverter } from '@backtrace/sdk-core';
import { BacktraceStackFrame } from '@backtrace/sdk-core/src/model/data/BacktraceStackTrace';
import { JavaScriptEngine } from '@backtrace/sdk-core/src/model/data/JavaScriptEngine';

export class SpiderMonkeyStackTraceConverter implements BacktraceStackTraceConverter {
    public readonly UNKNOWN_FRAME = 'unknown';
    public readonly ANONYMOUS_FUNCTION = 'anonymous';
    private readonly ANONYMOUS_FUNCTIONS = ['()', '(null)', ''];

    get engine(): JavaScriptEngine {
        return 'SpiderMonkey';
    }

    public convert(report: BacktraceReport): BacktraceStackFrame[] {
        const result: BacktraceStackFrame[] = [];
        if (!report.stackTrace) {
            return result;
        }
        const stackFrames = report.stackTrace.split('\n');

        for (const stackFrame of stackFrames) {
            const normalizedStackFrame = stackFrame.trim();
            if (!normalizedStackFrame) {
                continue;
            }
            const frame = this.parseFrame(normalizedStackFrame);
            if (this.ANONYMOUS_FUNCTIONS.includes(frame.funcName)) {
                frame.funcName = this.ANONYMOUS_FUNCTION;
            }
            result.push(frame);
        }

        return result;
    }

    private parseFrame(stackFrame: string): BacktraceStackFrame {
        const functionSeparatorIndex = this.generateSeparatorIndex(stackFrame);
        //invalid frame
        if (functionSeparatorIndex === -1) {
            return {
                funcName: stackFrame,
                library: this.UNKNOWN_FRAME,
            };
        }

        let functionName = stackFrame.substring(0, functionSeparatorIndex);
        if (!functionName) {
            functionName = this.ANONYMOUS_FUNCTION;
        }
        let sourceCodeInformation = stackFrame.substring(functionSeparatorIndex + 1);
        if (sourceCodeInformation.indexOf('eval') !== -1) {
            sourceCodeInformation = this.cleanUpEvalInformation(sourceCodeInformation);
        }
        const sourceCodeParts = sourceCodeInformation.split(':');

        // check if the column information is available - if is not, we should use the legacy parser
        const sourceCodeOrRowNumber = sourceCodeParts[sourceCodeParts.length - 2];
        const possibleRowNumber = parseInt(sourceCodeOrRowNumber);

        return isNaN(possibleRowNumber)
            ? this.generateLegacyFirefoxFrame(functionName, sourceCodeParts)
            : this.generateFirefoxFrame(functionName, sourceCodeParts);
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

    private generateLegacyFirefoxFrame(functionName: string, sourceCodeParts: string[]): BacktraceStackFrame {
        const lineNumberStart = sourceCodeParts.length - 1;
        const lineNumber = parseInt(sourceCodeParts[lineNumberStart]);
        const library = sourceCodeParts.slice(0, lineNumberStart).join(':');
        return {
            library: library,
            funcName: functionName,
            line: isNaN(lineNumber) ? undefined : lineNumber,
        };
    }

    private generateFirefoxFrame(functionName: string, sourceCodeParts: string[]): BacktraceStackFrame {
        const lineNumberStart = sourceCodeParts.length - 2;
        const lineNumber = parseInt(sourceCodeParts[lineNumberStart]);
        const columnName = parseInt(sourceCodeParts[lineNumberStart + 1]);
        const library = sourceCodeParts.slice(0, lineNumberStart).join(':');

        return {
            library: library,
            funcName: functionName,
            column: columnName,
            line: lineNumber,
        };
    }

    private cleanUpEvalInformation(sourceCodeInformation: string): string {
        const evalSeparator = ' > eval';
        const evalIndex = sourceCodeInformation.indexOf(evalSeparator);
        if (evalIndex === -1) {
            return sourceCodeInformation;
        }

        const lineSeparator = ' line ';
        const lineSeparatorIndex = sourceCodeInformation.indexOf(lineSeparator);

        if (lineSeparatorIndex === -1) {
            return sourceCodeInformation.replace(evalSeparator, '');
        }

        const textToRemove = sourceCodeInformation.substring(lineSeparatorIndex, evalIndex + evalSeparator.length);
        return sourceCodeInformation.replace(textToRemove, '');
    }
}
