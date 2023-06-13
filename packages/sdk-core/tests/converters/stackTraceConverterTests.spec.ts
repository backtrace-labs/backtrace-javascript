import { BacktraceReport } from '../../src';
import { V8StackTraceConverter } from '../../src/modules/converter/V8StackTraceConverter';
import { v8StackTraceTests } from './v8stackTraceTestCases';

describe('Stack trace converter tests', () => {
    describe('v8', () => {
        const converter = new V8StackTraceConverter();

        describe('Stack trace generator', () => {
            for (const stackTraceTest of v8StackTraceTests) {
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
