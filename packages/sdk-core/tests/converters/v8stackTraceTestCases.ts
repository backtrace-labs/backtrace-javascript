import { BacktraceStackFrame } from '../../src/model/data/BacktraceStackTrace.js';

export const v8StackTraceTests: Array<{
    name: string;
    test: { message: string; stackTrace: string };
    expectation: BacktraceStackFrame[];
}> = [
    {
        name: 'async function',
        test: {
            message: 'TypeError: invalid function invocation',
            stackTrace:
                'TypeError: invalid function invocation \n' +
                'at getLsTree2 (/path/to/code/dist/src/lib/file_routines.js:232:42)\n' +
                'at new Promise (<anonymous>)\n' +
                'at getFilePath (/path/to/code/dist/src/lib/file_routines.js:480:24)\n' +
                'at getFileDirectory (/path/to/code/dist/src/lib/file_routines.js:621:40)\n' +
                'at async getFile (/path/to/code/dist/src/lib/file_routines.js:837:22)\n' +
                'at async /path/to/code/dist/src/controller/controller-name.js:70:30',
        },
        expectation: [
            {
                funcName: 'getLsTree2',
                library: '/path/to/code/dist/src/lib/file_routines.js',
                line: 232,
                column: 42,
            },
            {
                funcName: 'new Promise (<anonymous>)',
                library: '',
            },
            {
                funcName: 'getFilePath',
                library: '/path/to/code/dist/src/lib/file_routines.js',
                line: 480,
                column: 24,
            },
            {
                funcName: 'getFileDirectory',
                library: '/path/to/code/dist/src/lib/file_routines.js',
                line: 621,
                column: 40,
            },
            {
                funcName: 'getFile',
                library: '/path/to/code/dist/src/lib/file_routines.js',
                line: 837,
                column: 22,
            },
            {
                funcName: 'anonymous',
                library: '/path/to/code/dist/src/controller/controller-name.js',
                line: 70,
                column: 30,
            },
        ],
    },
    {
        name: 'generic anonymous',
        test: {
            message: `Cannot read properties of undefined (reading 'split')`,
            stackTrace:
                "TypeError: Cannot read properties of undefined (reading 'split')\n" +
                'at DifferentClass.convert (/path/to/module/lib/modules/converter/DifferentClass.js:12:37)\n' +
                'at DataBuilder.create (/path/to/module/lib/modules/data/DataBuilder.js:45:57)\n' +
                'at DataBuilder.build (/path/to/module/lib/modules/data/DataBuilder.js:16:59)\n' +
                'at Client.create (/path/to/module/lib/Client.js:176:49)\n' +
                'at Client.<anonymous> (/path/to/module/lib/Client.js:130:40)\n' +
                'at Generator.next (<anonymous>) at /path/to/module/lib/Client.js:8:71\n' +
                'at new Promise (<anonymous>) at /path/to/module/lib/Client.js:4:12\n' +
                'at Client.generate (/path/to/module/lib/Client.js:114:16)',
        },
        expectation: [
            {
                funcName: 'DifferentClass.convert',
                library: '/path/to/module/lib/modules/converter/DifferentClass.js',
                line: 12,
                column: 37,
            },
            {
                funcName: 'DataBuilder.create',
                library: '/path/to/module/lib/modules/data/DataBuilder.js',
                line: 45,
                column: 57,
            },
            {
                funcName: 'DataBuilder.build',
                library: '/path/to/module/lib/modules/data/DataBuilder.js',
                line: 16,
                column: 59,
            },
            {
                funcName: 'Client.create',
                library: '/path/to/module/lib/Client.js',
                line: 176,
                column: 49,
            },
            {
                funcName: 'Client.<anonymous>',
                library: '/path/to/module/lib/Client.js',
                line: 130,
                column: 40,
            },
            {
                funcName: 'Generator.next (<anonymous>)',
                library: '/path/to/module/lib/Client.js',
                line: 8,
                column: 71,
            },
            {
                funcName: 'new Promise (<anonymous>)',
                library: '/path/to/module/lib/Client.js',
                line: 4,
                column: 12,
            },
            {
                funcName: 'Client.generate',
                library: '/path/to/module/lib/Client.js',
                line: 114,
                column: 16,
            },
        ],
    },
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
