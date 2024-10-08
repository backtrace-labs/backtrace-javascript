import { V8StackTraceConverter } from '../../src/modules/converter/V8StackTraceConverter.js';
import { v8StackTraceTests } from './v8stackTraceTestCases.js';

describe('Stack trace converter tests', () => {
    describe('v8', () => {
        const converter = new V8StackTraceConverter('address at');

        describe('Stack trace generator', () => {
            for (const stackTraceTest of v8StackTraceTests) {
                it(`Generator: ${stackTraceTest.name}`, () => {
                    const convertedStackFrames = converter.convert(
                        stackTraceTest.test.stackTrace,
                        stackTraceTest.test.message,
                    );

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
