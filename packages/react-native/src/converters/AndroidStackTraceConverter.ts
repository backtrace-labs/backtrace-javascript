import { type BacktraceStackFrame } from '@backtrace-labs/sdk-core';

export class AndroidStackTraceConverter {
    public readonly NativeLibraryName = 'Native';

    public convert(androidStackTrace: string): BacktraceStackFrame[] {
        const result: BacktraceStackFrame[] = [];
        if (!androidStackTrace) {
            return result;
        }

        const frames = androidStackTrace.trim().split('\n');
        for (const frame of frames) {
            const parameterStartIndex = frame.indexOf('(');
            const sourceCodeInformation = frame.substring(parameterStartIndex + 1, frame.length - 1);
            const sourceCodeInfo = sourceCodeInformation.split(':');
            let library = sourceCodeInfo[0] as string;
            if (frame.startsWith('java.lang') && sourceCodeInformation === 'Unknown Source') {
                library = sourceCodeInformation;
            }
            if (library === 'Native Method') {
                library = this.NativeLibraryName;
            }

            const resultFrame: BacktraceStackFrame = {
                funcName: frame.substring(0, parameterStartIndex),
                library,
            };

            const lineNumber = sourceCodeInfo[1];
            if (lineNumber) {
                resultFrame.line = parseInt(lineNumber);
            }

            result.push(resultFrame);
        }

        return result;
    }
}
