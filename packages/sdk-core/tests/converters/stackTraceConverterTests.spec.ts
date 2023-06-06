import { StackTraceConverter } from '../../src/modules/converter/StackTraceConverter';

describe('Stack trace converter tests', () => {
    const errorMessage = `Stack trace converter error message`;

    describe('safari', () => {
        const converter = new StackTraceConverter('safari');
        it('should correctly convert safari stack trace', () => {
            const functionNames = ['a', 'b', 'c'];
            const safariStackTrace = `${functionNames[0]}@
                    ${functionNames[1]}@
                    ${functionNames[2]}@
                    global code@
                    evaluateWithScopeExtension@[native code]
                    @[native code]
                    _wrapCall@[native code] `;
            const stackTrace = converter.convert(errorMessage, safariStackTrace);

            expect(stackTrace.length).toBe(safariStackTrace.split('\n').length);
            for (let index = 0; index < functionNames.length; index++) {
                const expectedFunctionName = functionNames[index];
                const actualFunctionName = stackTrace[index].funcName;
                expect(actualFunctionName).toBe(expectedFunctionName);
            }
        });

        it('should generate correct line and column numbers', () => {
            const expectedFrames = [
                [1, 2],
                [3, 4],
                [5, 6],
                [7, 8],
            ];
            const mozillaStackTrace = `a@test.html:${expectedFrames[0][0]}:${expectedFrames[0][1]}
                b@test.html:${expectedFrames[1][0]}:${expectedFrames[1][1]}
                c@test.html:${expectedFrames[2][0]}:${expectedFrames[2][1]}
                @test.html:${expectedFrames[3][0]}:${expectedFrames[3][1]}`;

            const stackTrace = converter.convert(errorMessage, mozillaStackTrace);

            for (let index = 0; index < expectedFrames.length; index++) {
                const frameInfo = expectedFrames[index];
                const generatedStackFrame = stackTrace[index];
                expect(generatedStackFrame.line).toBe(frameInfo[0]);
                expect(generatedStackFrame.column).toBe(frameInfo[1]);
            }
        });

        it('should convert native code into unknown', () => {
            const safariStackTrace = `@[native code]`;
            const stackTrace = converter.convert(errorMessage, safariStackTrace);

            expect(stackTrace[0].library).toBe(converter.UNKNOWN_FRAME);
        });
    });

    describe('v8', () => {
        const converter = new StackTraceConverter('v8');
        it('should correctly convert v8 stack trace', () => {
            const functionNames = ['a', 'b', 'c', ''];
            const v8StackTrace = `Error: ${errorMessage}
                at ${functionNames[0]} (<anonymous>:1:22)
                at ${functionNames[1]} (<anonymous>:1:16)
                at ${functionNames[2]} (<anonymous>:1:16)
                at ${functionNames[3]}<anonymous>:1:6`;

            const stackTrace = converter.convert(errorMessage, v8StackTrace);

            expect(stackTrace.length).toBe(functionNames.length);
            for (let index = 0; index < functionNames.length; index++) {
                const expectedFunctionName = functionNames[index];
                const actualFunctionName = stackTrace[index].funcName;
                expect(actualFunctionName).toBe(expectedFunctionName);
            }
        });

        it('should convert anonymous stack frames', () => {
            const v8StackTrace = `Error: ${errorMessage}
                    at a (<anonymous>:1:22)`;

            const stackTrace = converter.convert(errorMessage, v8StackTrace);

            expect(stackTrace[0].library).toBe(converter.UNKNOWN_FRAME);
        });
    });

    describe('Mozilla', () => {
        const converter = new StackTraceConverter('firefox');
        it('should generate correct firefox stack trace', () => {
            const functionNames = ['a', 'b', 'c', ''];
            const mozillaStackTrace = `${functionNames[0]}@debugger eval code:1:24
                ${functionNames[1]}@debugger eval code:1:19
                ${functionNames[2]}@debugger eval code:1:19
                ${functionNames[3]}@debugger eval code:1:5`;

            const stackTrace = converter.convert(errorMessage, mozillaStackTrace);

            expect(stackTrace.length).toBe(functionNames.length);
            for (let index = 0; index < functionNames.length; index++) {
                const expectedFunctionName = functionNames[index];
                const actualFunctionName = stackTrace[index].funcName;
                expect(actualFunctionName).toBe(expectedFunctionName);
            }
        });

        it('should generate correct line and column numbers', () => {
            const expectedFrames = [
                [1, 2],
                [3, 4],
                [5, 6],
                [7, 8],
            ];
            const mozillaStackTrace = `a@debugger eval code:${expectedFrames[0][0]}:${expectedFrames[0][1]}
                b@debugger eval code:${expectedFrames[1][0]}:${expectedFrames[1][1]}
                c@debugger eval code:${expectedFrames[2][0]}:${expectedFrames[2][1]}
                @debugger eval code:${expectedFrames[3][0]}:${expectedFrames[3][1]}`;

            const stackTrace = converter.convert(errorMessage, mozillaStackTrace);

            for (let index = 0; index < expectedFrames.length; index++) {
                const frameInfo = expectedFrames[index];
                const generatedStackFrame = stackTrace[index];
                expect(generatedStackFrame.line).toBe(frameInfo[0]);
                expect(generatedStackFrame.column).toBe(frameInfo[1]);
            }
        });

        it('should parse correctly legacy mozilla line numbers', () => {
            const expectedFrames = [9, 8, 7, 6];
            const mozillaStackTrace = `a@debugger eval code:${expectedFrames[0]}
                b@debugger eval code:${expectedFrames[1]}
                c@debugger eval code:${expectedFrames[2]}
                @debugger eval code:${expectedFrames[3]}`;

            const stackTrace = converter.convert(errorMessage, mozillaStackTrace);

            for (let index = 0; index < expectedFrames.length; index++) {
                const frameInfo = expectedFrames[index];
                const generatedStackFrame = stackTrace[index];
                expect(generatedStackFrame.line).toBe(frameInfo);
                expect(generatedStackFrame.column).toBeUndefined();
            }
        });

        it('should convert anonymous stack frames', () => {
            const mozillaStackTrace = `a@debugger eval code:1:24`;
            const stackTrace = converter.convert(errorMessage, mozillaStackTrace);

            expect(stackTrace[0].library).toBe(converter.UNKNOWN_FRAME);
        });
    });
});
