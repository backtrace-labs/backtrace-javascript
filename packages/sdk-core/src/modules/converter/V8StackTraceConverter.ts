import { BacktraceStackFrame } from '../../model/data/BacktraceStackTrace';
import { JavaScriptEngine } from '../../model/data/JavaScriptEngine';
import { BacktraceStackTraceConverter } from './BacktraceStackTraceConverter';
import { ANONYMOUS_FUNCTION, UNKNOWN_FRAME } from './consts/frameNamesConsts';

export class V8StackTraceConverter implements BacktraceStackTraceConverter {
    get engine(): JavaScriptEngine {
        return 'v8';
    }

    convert(stackTrace: string, message: string): BacktraceStackFrame[] {
        const result: BacktraceStackFrame[] = [];
        let stackFrames = stackTrace.split('\n');
        const errorHeader = message.split('\n');

        // remove error header from stack trace - if the error header exists
        if (stackFrames[0].indexOf(errorHeader[0]) !== -1) {
            stackFrames = stackFrames.slice(errorHeader.length);
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
        const sourceCodeSeparator = ' (';
        const sourceCodeStartIndex = stackFrame.indexOf(sourceCodeSeparator);
        const anonymousFunction = sourceCodeStartIndex === -1;
        if (anonymousFunction) {
            return {
                funcName: ANONYMOUS_FUNCTION,
                ...this.parseSourceCodeInformation(stackFrame),
            };
        }
        return {
            funcName: stackFrame.substring(0, sourceCodeStartIndex),
            ...this.parseSourceCodeInformation(
                stackFrame.substring(sourceCodeStartIndex + sourceCodeSeparator.length, stackFrame.length - 1),
            ),
        };
    }

    private parseSourceCodeInformation(
        sourceCodeInformation: string,
    ): Omit<BacktraceStackFrame, 'funcName' | 'sourceCode'> {
        if (sourceCodeInformation.startsWith('eval')) {
            return this.extractEvalInformation(sourceCodeInformation);
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
