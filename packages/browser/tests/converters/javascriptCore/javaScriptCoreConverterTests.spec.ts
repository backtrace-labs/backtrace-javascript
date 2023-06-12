import { BacktraceReport } from '@backtrace/sdk-core';
import { JavaScriptCoreConverter } from '../../../src/converters/JavaScriptCoreConverter';
import { javaScriptCoreStackTraceTests } from './javaScriptCoreStackTraceTestCases';

describe('Stack trace converter tests', () => {
    describe('JavaScriptCore', () => {
        const converter = new JavaScriptCoreConverter();

        describe('Stack trace generator', () => {
            for (const stackTraceTest of javaScriptCoreStackTraceTests) {
                it(`Generator: ${stackTraceTest.name}`, () => {
                    const convertedStackFrames = converter.convert(stackTraceTest.test as BacktraceReport);

                    expect(convertedStackFrames.length).toBe(stackTraceTest.expectation.length);
                    for (let index = 0; index < convertedStackFrames.length; index++) {
                        const convertedStackFrame = convertedStackFrames[index];
                        expect(convertedStackFrame).toEqual(stackTraceTest.expectation[index]);
                    }
                });
            }
        });
    });
});
