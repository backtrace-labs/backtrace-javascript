import { BacktraceStackFrame } from '@backtrace/sdk-core/src/model/data/BacktraceStackTrace';

const defaultWebsite = `http://localhost/main.js`;
export const javaScriptCoreStackTraceTests: Array<{
    name: string;
    test: { message: string; stackTrace: string };
    expectation: BacktraceStackFrame[];
}> = [
    {
        name: 'Missing @',
        test: {
            message: 'Error message not related to stack trace',
            stackTrace: `${defaultWebsite}:5:5
                    bar@${defaultWebsite}:3:3
                    foo@${defaultWebsite}:2:2
                    @${defaultWebsite}:1:1`,
        },
        expectation: [
            {
                funcName: 'anonymous',
                library: defaultWebsite,
                line: 5,
                column: 5,
            },
            {
                funcName: 'bar',
                library: defaultWebsite,
                line: 3,
                column: 3,
            },
            {
                funcName: 'foo',
                library: defaultWebsite,
                line: 2,
                column: 2,
            },
            {
                funcName: 'anonymous',
                library: defaultWebsite,
                line: 1,
                column: 1,
            },
        ],
    },
    {
        name: 'eval',
        test: {
            message: 'Foo bar',
            stackTrace: `foo@
                bar@
                eval code@
                eval@[native code]
                @${defaultWebsite}:17:11`,
        },
        expectation: [
            {
                funcName: 'foo',
                library: 'unknown',
                line: undefined,
                column: undefined,
            },
            {
                funcName: 'bar',
                library: 'unknown',
                line: undefined,
                column: undefined,
            },
            {
                funcName: 'eval code',
                library: 'unknown',
                line: undefined,
                column: undefined,
            },
            {
                funcName: 'eval',
                library: '[native code]',
                line: undefined,
                column: undefined,
            },
            {
                funcName: 'anonymous',
                library: defaultWebsite,
                line: 17,
                column: 11,
            },
        ],
    },
    {
        name: 'Source code with @ character & @ in function name',
        test: {
            message: 'Foo bar',
            stackTrace: `@file:///test@test.html:26:11
                trace@file:///test@test.html:29:13
                b@file:///test@test.html:31:14
                a@file:///test@test.html:34:10
                @file:///test@test.html:37:10`,
        },
        expectation: [
            {
                funcName: 'anonymous',
                library: `file:///test@test.html`,
                line: 26,
                column: 11,
            },
            {
                funcName: 'trace',
                library: `file:///test@test.html`,
                line: 29,
                column: 13,
            },
            {
                funcName: 'b',
                library: `file:///test@test.html`,
                line: 31,
                column: 14,
            },
            {
                funcName: 'a',
                library: `file:///test@test.html`,
                line: 34,
                column: 10,
            },
            {
                funcName: 'anonymous',
                library: `file:///test@test.html`,
                line: 37,
                column: 10,
            },
        ],
    },
];
