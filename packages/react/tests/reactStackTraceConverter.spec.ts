import { BacktraceStackTraceConverter, JavaScriptEngine } from '@backtrace/browser';
import { ReactStackTraceConverter } from '../src/converters/ReactStackTraceConverter';
/* eslint-disable @typescript-eslint/no-explicit-any */

class MockConverter implements BacktraceStackTraceConverter {
    public get engine(): JavaScriptEngine {
        return 'v8';
    }
    convert(stackTrace: string, message: string) {
        // using to remove unused error
        stackTrace;
        message;
        return [
            {
                funcName: 'mock-function',
                library: 'mock-library',
            },
        ];
    }
}

describe('ReactStackTraceConverter', () => {
    const converter = new ReactStackTraceConverter(new MockConverter());
    describe('isReact16ComponentStack', () => {
        let isReact16ComponentStackSpy: jest.SpyInstance;
        beforeEach(() => {
            isReact16ComponentStackSpy = jest.spyOn(converter as any, 'isReact16ComponentStack');
        });

        afterEach(() => {
            isReact16ComponentStackSpy.mockRestore();
        });
        it('should return false if an empty stack is passed in', () => {
            const stack = '';
            converter.convert(stack);
            expect(isReact16ComponentStackSpy).toReturnWith(false);
        });

        it('should return false for a component stack with no frames/components', () => {
            const stack = '   /n/n/n';
            converter.convert(stack);
            expect(isReact16ComponentStackSpy).toReturnWith(false);
        });

        it('should return false for a component stack greater than React v16 (a JS error stack - Chrome)', () => {
            const stack = `
                at App (http://localhost:3000/static/js/main.js:38:80)
                at ErrorBoundary (http://localhost:3000/static/js/main.js:41102:15)
            `;
            converter.convert(stack);
            expect(isReact16ComponentStackSpy).toReturnWith(false);
        });

        it('should return false for a component stack greater than React v16 (a JS error stack - Firefox)', () => {
            const stack = `
                App@http://localhost:3000/static/js/main.js:38:80
                ErrorBoundary@http://localhost:3000/static/js/main.js:41102:15
            `;
            converter.convert(stack);
            expect(isReact16ComponentStackSpy).toReturnWith(false);
        });

        it('should return false for a component stack greater than React v16 (a JS error stack - Safari)', () => {
            const stack = `
                App@http://localhost:3000/static/js/main.js:38:80
                ErrorBoundary@http://localhost:3000/static/js/main.js:41102:20
            `;
            converter.convert(stack);
            expect(isReact16ComponentStackSpy).toReturnWith(false);
        });

        it('should return true for a React v16 component stack', () => {
            const stack = `in App
                in ErrorBoundary
                in StrictMode`;
            converter.convert(stack);
            expect(isReact16ComponentStackSpy).toReturnWith(true);
        });

        it('should return true for a React v16 component stack with whitespaces for the first line', () => {
            const stack = `
                in App
                in ErrorBoundary
                in StrictMode`;
            converter.convert(stack);
            expect(isReact16ComponentStackSpy).toReturnWith(true);
        });
    });

    describe('parseReact16ComponentStack', () => {
        let parseReact16ComponentStackSpy: jest.SpyInstance;
        let isReact16ComponentStackSpy: jest.SpyInstance;
        beforeEach(() => {
            parseReact16ComponentStackSpy = jest.spyOn(converter as any, 'parseReact16ComponentStack');
            isReact16ComponentStackSpy = jest
                .spyOn(converter as any, 'isReact16ComponentStack')
                .mockImplementation(() => true);
        });

        afterEach(() => {
            parseReact16ComponentStackSpy.mockRestore();
            isReact16ComponentStackSpy.mockRestore();
        });

        it('should return an empty array for an empty stack string', () => {
            const stack = '';
            converter.convert(stack);
            expect(parseReact16ComponentStackSpy).toReturnWith(expect.arrayContaining([]));
        });

        it('should return an empty array for a stack with no frames', () => {
            const stack = '    \n\n\n  \t ';
            converter.convert(stack);
            expect(parseReact16ComponentStackSpy).toReturnWith(expect.arrayContaining([]));
        });

        it('should return unknown frames for a component stack greater than React v16 (a JS error stack - Chrome)', () => {
            const stack = `
                at App (http://localhost:3000/static/js/main.js:38:80)
                at ErrorBoundary (http://localhost:3000/static/js/main.js:41102:15)
            `;
            const expected = [
                {
                    funcName: 'unknown',
                    library: 'unknown',
                },
                {
                    funcName: 'unknown',
                    library: 'unknown',
                },
            ];
            converter.convert(stack);
            expect(parseReact16ComponentStackSpy).toReturnWith(expect.arrayContaining(expected));
        });

        it('should return unknown frames for a component stack greater than React v16 (a JS error stack - Firefox)', () => {
            const stack = `
                App@http://localhost:3000/static/js/main.js:38:80
                ErrorBoundary@http://localhost:3000/static/js/main.js:41102:15
            `;
            const expected = [
                {
                    funcName: 'unknown',
                    library: 'unknown',
                },
                {
                    funcName: 'unknown',
                    library: 'unknown',
                },
            ];
            converter.convert(stack);
            expect(parseReact16ComponentStackSpy).toReturnWith(expect.arrayContaining(expected));
        });

        it('should return unknown frames for a component stack greater than React v16 (a JS error stack - Safari)', () => {
            const stack = `
                App@http://localhost:3000/static/js/main.js:38:80
                ErrorBoundary@http://localhost:3000/static/js/main.js:41102:20
            `;
            const expected = [
                {
                    funcName: 'unknown',
                    library: 'unknown',
                },
                {
                    funcName: 'unknown',
                    library: 'unknown',
                },
            ];
            converter.convert(stack);
            expect(parseReact16ComponentStackSpy).toReturnWith(expect.arrayContaining(expected));
        });

        it('should return valid frames for a React v16 component stack', () => {
            const stack = `in App
                in ErrorBoundary
                in StrictMode`;
            const expected = [
                {
                    funcName: 'App',
                    library: 'unknown',
                },
                {
                    funcName: 'ErrorBoundary',
                    library: 'unknown',
                },
                {
                    funcName: 'StrictMode',
                    library: 'unknown',
                },
            ];
            converter.convert(stack);
            expect(parseReact16ComponentStackSpy).toReturnWith(expect.arrayContaining(expected));
        });

        it('should return valid frames for a React v16 component stack with whitespaces at the beginning', () => {
            const stack = `
                
                in App
                in ErrorBoundary
                in StrictMode`;
            const expected = [
                {
                    funcName: 'App',
                    library: 'unknown',
                },
                {
                    funcName: 'ErrorBoundary',
                    library: 'unknown',
                },
                {
                    funcName: 'StrictMode',
                    library: 'unknown',
                },
            ];
            converter.convert(stack);
            expect(parseReact16ComponentStackSpy).toReturnWith(expect.arrayContaining(expected));
        });
    });

    describe('convert', () => {
        let parseReact16ComponentStackSpy: jest.SpyInstance;
        let isReact16ComponentStackSpy: jest.SpyInstance;

        afterEach(() => {
            parseReact16ComponentStackSpy.mockRestore();
            isReact16ComponentStackSpy.mockRestore();
        });

        it('Should call parseReact16ComponentStack when it is a React 16 component stack', () => {
            const expected = {
                funcName: 'parse-funcName',
                library: 'parse-library',
            };
            parseReact16ComponentStackSpy = jest
                .spyOn(converter as any, 'parseReact16ComponentStack')
                .mockImplementation(() => {
                    return expected;
                });
            isReact16ComponentStackSpy = jest
                .spyOn(converter as any, 'isReact16ComponentStack')
                .mockImplementation(() => true);
            expect(converter.convert('')).toEqual(expect.objectContaining(expected));
        });

        it('Should call the stackTraceConverter.convert() when it is a React 17+ component stack', () => {
            const expected = {
                funcName: 'mock-function',
                library: 'mock-library',
            };
            parseReact16ComponentStackSpy = jest
                .spyOn(converter as any, 'parseReact16ComponentStack')
                .mockImplementation(() => {
                    return expected;
                });
            isReact16ComponentStackSpy = jest
                .spyOn(converter as any, 'isReact16ComponentStack')
                .mockImplementation(() => false);
            expect(converter.convert('')[0]).toEqual(expect.objectContaining(expected));
        });
    });

    describe('engine', () => {
        it('Should return v8', () => {
            const expected = 'v8';
            expect(converter.engine).toBe(expected);
        });
    });
});
