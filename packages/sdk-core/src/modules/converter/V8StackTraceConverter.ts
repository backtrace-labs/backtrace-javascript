import { BacktraceStackFrame } from '../../model/data/BacktraceStackTrace.js';
import { JavaScriptEngine } from '../../model/data/JavaScriptEngine.js';
import { BacktraceStackTraceConverter } from './BacktraceStackTraceConverter.js';
import { ANONYMOUS_FUNCTION, UNKNOWN_FRAME } from './consts/frameNamesConsts.js';

export class V8StackTraceConverter implements BacktraceStackTraceConverter {
    get engine(): JavaScriptEngine {
        return 'v8';
    }

    constructor(public readonly addressSeparator: string = '') {}

    convert(stackTrace: string, message: string): BacktraceStackFrame[] {
        const result: BacktraceStackFrame[] = [];
        let stackFrames = stackTrace.split('\n');
        const errorHeader = message.split('\n');

        // remove error header from stack trace - if the error header exists
        if (stackFrames[0].indexOf(errorHeader[0]) !== -1) {
            stackFrames = stackFrames.slice(errorHeader.length);
        } else {
            stackFrames = stackFrames.slice(1);
        }
        for (const stackFrame of stackFrames) {
            const normalizedStackFrame = stackFrame.trim();
            if (!normalizedStackFrame) {
                continue;
            }
            const frame = this.parseFrame(normalizedStackFrame);
            result.push(frame);
        }

        return result;
    }

    private parseFrame(stackFrame: string): BacktraceStackFrame {
        const frameSeparator = 'at ';
        if (!stackFrame.startsWith(frameSeparator)) {
            return {
                funcName: stackFrame,
                library: UNKNOWN_FRAME,
            };
        }

        stackFrame = stackFrame.substring(stackFrame.indexOf(frameSeparator) + frameSeparator.length);
        const asyncKeyword = 'async ';
        const sourceCodeSeparator = ' (';
        let sourceCodeStartIndex = stackFrame.indexOf(sourceCodeSeparator);
        const anonymousFunction = sourceCodeStartIndex === -1;
        if (anonymousFunction) {
            if (stackFrame.startsWith(asyncKeyword)) {
                stackFrame = stackFrame.substring(asyncKeyword.length);
            }
            return {
                funcName: ANONYMOUS_FUNCTION,
                ...this.parseSourceCodeInformation(stackFrame),
            };
        }

        let sourceCodeInformation = stackFrame.substring(
            sourceCodeStartIndex + sourceCodeSeparator.length - 1,
            stackFrame.length,
        );
        const anonymousGenericSymbol = '(<anonymous>)';
        if (sourceCodeInformation.startsWith(anonymousGenericSymbol)) {
            sourceCodeStartIndex += anonymousGenericSymbol.length + 1;
            sourceCodeInformation = sourceCodeInformation.substring(anonymousGenericSymbol.length);
        }

        if (sourceCodeInformation.startsWith(` ${frameSeparator}`)) {
            sourceCodeInformation = sourceCodeInformation.substring(frameSeparator.length + 1);
        } else {
            sourceCodeInformation = sourceCodeInformation.substring(1, sourceCodeInformation.length - 1);
        }

        let functionName = stackFrame.substring(0, sourceCodeStartIndex);
        if (functionName.startsWith(asyncKeyword)) {
            functionName = functionName.substring(asyncKeyword.length);
        }

        return {
            funcName: functionName,
            ...this.parseSourceCodeInformation(sourceCodeInformation),
        };
    }

    private parseSourceCodeInformation(
        sourceCodeInformation: string,
    ): Omit<BacktraceStackFrame, 'funcName' | 'sourceCode'> {
        if (sourceCodeInformation.startsWith('eval')) {
            return this.extractEvalInformation(sourceCodeInformation);
        }
        if (this.addressSeparator && sourceCodeInformation.startsWith(this.addressSeparator)) {
            sourceCodeInformation = sourceCodeInformation.substring(this.addressSeparator.length).trimStart();
        }
        const sourceCodeParts = sourceCodeInformation.split(':');
        const column = parseInt(sourceCodeParts[sourceCodeParts.length - 1]);
        const lineNumber = parseInt(sourceCodeParts[sourceCodeParts.length - 2]);
        const library = sourceCodeParts.slice(0, sourceCodeParts.length - 2).join(':');
        return {
            library,
            column: isNaN(column) ? undefined : column,
            line: isNaN(lineNumber) ? undefined : lineNumber,
        };
    }

    private extractEvalInformation(
        evalSourceCodeInformation: string,
    ): Omit<BacktraceStackFrame, 'funcName' | 'sourceCode'> {
        const sourceCodeStartSeparatorChar = '(';
        const sourceCodeEndSeparatorChar = ')';
        const sourceCodeStart = evalSourceCodeInformation.indexOf(sourceCodeStartSeparatorChar);
        const sourceCodeEnd = evalSourceCodeInformation.indexOf(sourceCodeEndSeparatorChar);
        if (sourceCodeStart === -1 || sourceCodeEnd === -1 || sourceCodeStart > sourceCodeEnd) {
            return {
                library: UNKNOWN_FRAME,
            };
        }
        const sourceCodeInformation = evalSourceCodeInformation.substring(
            sourceCodeStart + sourceCodeStartSeparatorChar.length,
            sourceCodeEnd,
        );
        return this.parseSourceCodeInformation(sourceCodeInformation);
    }
}
