import { BacktraceReport } from '@backtrace/sdk-core';

import { SpiderMonkeyStackTraceConverter } from '../../../src/converters/SpiderMonkeyStackTraceConverter';
import { spiderMonkeyStackTraceTests } from './spiderMonkeyStackTraceTestCases';

describe('Stack trace converter tests', () => {
    describe('Spider monkey', () => {
        const converter = new SpiderMonkeyStackTraceConverter();

        describe('Stack trace generator', () => {
            for (const stackTraceTest of spiderMonkeyStackTraceTests) {
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
