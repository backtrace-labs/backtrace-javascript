import { JavaScriptCoreStackTraceConverter } from '../../../src/converters/JavaScriptCoreStackTraceConverter';
import { javaScriptCoreStackTraceTests } from './javaScriptCoreStackTraceTestCases';

describe('Stack trace converter tests', () => {
    describe('JavaScriptCore', () => {
        const converter = new JavaScriptCoreStackTraceConverter();

        describe('Stack trace generator', () => {
            for (const stackTraceTest of javaScriptCoreStackTraceTests) {
                it(`Generator: ${stackTraceTest.name}`, () => {
                    const convertedStackFrames = converter.convert(stackTraceTest.test.stackTrace);

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
