import { BacktraceStackFrame } from '../../src/model/data/BacktraceStackTrace';

export const v8StackTraceTests: Array<{
    name: string;
    test: { message: string; stackTrace: string };
    expectation: BacktraceStackFrame[];
}> = [
    {
        name: 'old source code syntax',
        test: {
            message: "Object #<Object> has no method 'foobar'",
            stackTrace:
                "TypeError: Object #<Object> has no method 'foobar'\n" +
                '    at a (a.js:40:40)\n' +
                '    at b (b.js:30:30)\n' +
                '    at c (c.js:20:20)\n' +
                '    at main.js:10:10',
        },
        expectation: [
            {
                funcName: 'a',
                library: 'a.js',
                column: 40,
                line: 40,
            },
            {
                funcName: 'b',
                library: 'b.js',
                column: 30,
                line: 30,
            },
            {
                funcName: 'c',
                library: 'c.js',
                column: 20,
                line: 20,
            },
            {
                funcName: 'anonymous',
                library: 'main.js',
                column: 10,
                line: 10,
            },
        ],
    },
    {
        name: 'default error',
        test: {
            message: 'Foo bar',
            stackTrace:
                'Error: Foo bar\n' +
                '    at throwError (http://localhost/main.js:3:1)\n' +
                '    at generateError (http://localhost/main.js:2:1)\n' +
                '    at HTMLButtonElement.onclick (http://localhost/main.js:1:2)',
        },
        expectation: [
            {
                funcName: 'throwError',
                library: 'http://localhost/main.js',
                column: 1,
                line: 3,
            },
            {
                funcName: 'generateError',
                library: 'http://localhost/main.js',
                column: 1,
                line: 2,
            },
            {
                funcName: 'HTMLButtonElement.onclick',
                library: 'http://localhost/main.js',
                column: 2,
                line: 1,
            },
        ],
    },
    {
        name: 'new test',
        test: {
            message: 'Foo bar',
            stackTrace:
                'Error: Foo bar\n' +
                '    at new FooError (http://localhost/main.js:3:1)\n' +
                '    at generateError (http://localhost/main.js:2:1)\n' +
                '    at HTMLButtonElement.onclick (http://localhost/main.js:1:2)',
        },
        expectation: [
            {
                funcName: 'new FooError',
                library: 'http://localhost/main.js',
                column: 1,
                line: 3,
            },
            {
                funcName: 'generateError',
                library: 'http://localhost/main.js',
                column: 1,
                line: 2,
            },
            {
                funcName: 'HTMLButtonElement.onclick',
                library: 'http://localhost/main.js',
                column: 2,
                line: 1,
            },
        ],
    },
    {
        name: 'eval test',
        test: {
            message: 'Foo bar',
            stackTrace: `Error: Foo bar
                    at foo (eval at <anonymous> (test.html:3:7), <anonymous>:1:51)
                    at bar (eval at <anonymous> (test.html:3:7), <anonymous>:1:18)
                    at eval (eval at <anonymous> (test.html:3:7), <anonymous>:1:83)
                    at test.html:7:7`,
        },
        expectation: [
            {
                funcName: 'foo',
                library: 'test.html',
                column: 7,
                line: 3,
            },
            {
                funcName: 'bar',
                library: 'test.html',
                column: 7,
                line: 3,
            },
            {
                funcName: 'eval',
                library: 'test.html',
                column: 7,
                line: 3,
            },
            {
                funcName: 'anonymous',
                library: 'test.html',
                column: 7,
                line: 7,
            },
        ],
    },
    {
        name: 'Address at test',
        test: {
            message: 'Foo bar',
            stackTrace: `Error: Foo bar
                    at foo (address at main.js.bundle:1:2)
                    at bar (address at main.js.bundle:3:4)`,
        },
        expectation: [
            {
                funcName: 'foo',
                library: 'main.js.bundle',
                column: 2,
                line: 1,
            },
            {
                funcName: 'bar',
                library: 'main.js.bundle',
                column: 4,
                line: 3,
            },
        ],
    },
];
