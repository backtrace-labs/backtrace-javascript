import { BacktraceStackFrame } from '../../model/data/BacktraceStackTrace';
import { JavaScriptEngine } from '../../model/data/JavaScriptEngine';

export class StackTraceConverter {
    public readonly UNKNOWN_FRAME = 'unknown';
    private readonly ANONYMOUS_FRAME: Record<JavaScriptEngine, string> = {
        ['firefox']: 'debugger eval code',
        ['v8']: '<anonymous>',
        ['safari']: '[native code]',
    };
    constructor(private readonly _lang: JavaScriptEngine) {}

    public convert(message: string, stackTrace: string): BacktraceStackFrame[] {
        const result: BacktraceStackFrame[] = [];
        if (!stackTrace) {
            return result;
        }
        let stackFrames = stackTrace.split('\n');
        const errorHeader = message.split('\n');

        // remove error header from stack trace - if the error header exists
        if (stackFrames[0].indexOf(errorHeader[0]) !== -1) {
            stackFrames = stackFrames.slice(errorHeader.length);
        }

        for (const stackFrame of stackFrames) {
            const normalizedStackFrame = stackFrame.trim();
            const frame = this.parseFrame(normalizedStackFrame);
            if (this.ANONYMOUS_FRAME[this._lang] === frame.library) {
                frame.library = this.UNKNOWN_FRAME;
            }
            result.push(frame);
        }

        return result;
    }

    private parseFrame(stackFrame: string): BacktraceStackFrame {
        switch (this._lang) {
            case 'firefox': {
                return this.parseFirefoxStackFrame(stackFrame);
            }
            case 'safari': {
                return this.parseSafariStackFrame(stackFrame);
            }
            default: {
                return this.parseV8StackFrame(stackFrame);
            }
        }
    }

    private parseSafariStackFrame(stackFrame: string): BacktraceStackFrame {
        const functionSeparator = '@';
        const functionSeparatorIndex = stackFrame.indexOf(functionSeparator);
        if (functionSeparatorIndex === -1) {
            return {
                funcName: stackFrame,
                library: this.UNKNOWN_FRAME,
            };
        }

        const functionName = stackFrame.substring(0, functionSeparatorIndex) ?? this.UNKNOWN_FRAME;
        const sourceCodeInformation = stackFrame.substring(functionSeparatorIndex + functionSeparator.length);

        if (!sourceCodeInformation || sourceCodeInformation === '[native code]') {
            return {
                funcName: functionName,
                library: this.UNKNOWN_FRAME,
            };
        }

        const sourceCodeParts = sourceCodeInformation.split(':');
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

    private parseFirefoxStackFrame(stackFrame: string): BacktraceStackFrame {
        const functionSeparator = '@';
        const functionSeparatorIndex = stackFrame.indexOf(functionSeparator);
        if (functionSeparatorIndex === -1) {
            return {
                funcName: stackFrame,
                library: this.UNKNOWN_FRAME,
            };
        }

        const functionName = stackFrame.substring(0, functionSeparatorIndex);
        const sourceCodeInformation = stackFrame.substring(functionSeparatorIndex + functionSeparator.length);
        const sourceCodeParts = sourceCodeInformation.split(':');

        // check if the column information is available - if is not, we should use the legacy parser
        const sourceCodeOrRowNumber = sourceCodeParts[sourceCodeParts.length - 2];
        const possibleRowNumber = parseInt(sourceCodeOrRowNumber);

        return isNaN(possibleRowNumber)
            ? this.generateLegacyFirefoxFrame(functionName, sourceCodeParts)
            : this.generateFirefoxFrame(functionName, sourceCodeParts);
    }

    private generateLegacyFirefoxFrame(functionName: string, sourceCodeParts: string[]): BacktraceStackFrame {
        const lineNumberStart = sourceCodeParts.length - 1;
        const lineNumber = parseInt(sourceCodeParts[lineNumberStart]);
        const sourceCode = sourceCodeParts.slice(0, lineNumberStart).join(':');
        return {
            funcName: functionName,
            library: sourceCode,
            line: isNaN(lineNumber) ? undefined : lineNumber,
        };
    }

    private generateFirefoxFrame(functionName: string, sourceCodeParts: string[]): BacktraceStackFrame {
        const lineNumberStart = sourceCodeParts.length - 2;
        const lineNumber = parseInt(sourceCodeParts[lineNumberStart]);
        const columnName = parseInt(sourceCodeParts[lineNumberStart + 1]);
        const sourceCode = sourceCodeParts.slice(0, lineNumberStart).join(':');

        return {
            funcName: functionName,
            library: sourceCode,
            column: columnName,
            line: lineNumber,
        };
    }

    private parseV8StackFrame(stackFrame: string): BacktraceStackFrame {
        const frameSeparator = 'at ';
        if (!stackFrame.startsWith(frameSeparator)) {
            return {
                funcName: stackFrame,
                library: this.UNKNOWN_FRAME,
            };
        }

        stackFrame = stackFrame.substring(stackFrame.indexOf(frameSeparator) + frameSeparator.length);
        const sourceCodeSeparator = ' (';
        const sourceCodeStartIndex = stackFrame.indexOf(sourceCodeSeparator);
        const functionName = stackFrame.substring(0, sourceCodeStartIndex);
        const sourceCodeInformation = stackFrame.substring(
            sourceCodeStartIndex + sourceCodeSeparator.length,
            stackFrame.length - 1,
        );

        const sourceCodeParts = sourceCodeInformation.split(':');
        const column = parseInt(sourceCodeParts[sourceCodeParts.length - 1]);
        const lineNumber = parseInt(sourceCodeParts[sourceCodeParts.length - 2]);
        const library = sourceCodeParts.slice(0, sourceCodeParts.length - 2).join(':');
        return {
            funcName: functionName,
            library,
            column: isNaN(column) ? undefined : column,
            line: isNaN(lineNumber) ? undefined : lineNumber,
        };
    }
}
