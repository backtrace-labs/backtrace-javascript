import { BacktraceStackFrame } from '@backtrace-labs/sdk-core/src/model/data/BacktraceStackTrace';

const defaultWebsite = `http://localhost/main.js`;
export const spiderMonkeyStackTraceTests: Array<{
    name: string;
    test: { message: string; stackTrace: string };
    expectation: BacktraceStackFrame[];
}> = [
    {
        name: 'old Firefox',
        test: {
            message: 'Error message not related to stack trace',
            stackTrace: `()@${defaultWebsite}:5\n
                    (null)@${defaultWebsite}:4\n
                    bar(1)@${defaultWebsite}:3\n
                    foo(2)@${defaultWebsite}:2\n
                    @${defaultWebsite}:1\n`,
        },
        expectation: [
            {
                funcName: 'anonymous',
                library: defaultWebsite,
                line: 5,
            },
            {
                funcName: 'anonymous',
                library: defaultWebsite,
                line: 4,
            },
            {
                funcName: 'bar(1)',
                library: defaultWebsite,
                line: 3,
            },
            {
                funcName: 'foo(2)',
                library: defaultWebsite,
                line: 2,
            },
            {
                funcName: 'anonymous',
                library: defaultWebsite,
                line: 1,
            },
        ],
    },
    {
        name: 'line and column numbers',
        test: {
            message: 'Error message not related to stack trace',
            stackTrace: `foo@${defaultWebsite}:33:44
                bar@${defaultWebsite}:11:22`,
        },
        expectation: [
            {
                funcName: 'foo',
                library: defaultWebsite,
                column: 44,
                line: 33,
            },
            {
                funcName: 'bar',
                library: defaultWebsite,
                column: 22,
                line: 11,
            },
        ],
    },
    {
        name: 'Eval',
        test: {
            message: 'Foo bar',
            stackTrace: `foo@${defaultWebsite} line 18 > eval:1:51
                bar@${defaultWebsite} line 18 > eval:1:18
                @${defaultWebsite} line 18 > eval:1:83
                @${defaultWebsite}:18:7
                setTimeout handler*@${defaultWebsite}:17:15`,
        },
        expectation: [
            {
                funcName: 'foo',
                library: defaultWebsite,
                line: 1,
                column: 51,
            },
            {
                funcName: 'bar',
                library: defaultWebsite,
                line: 1,
                column: 18,
            },
            {
                funcName: 'anonymous',
                library: defaultWebsite,
                line: 1,
                column: 83,
            },
            {
                funcName: 'anonymous',
                library: defaultWebsite,
                line: 18,
                column: 7,
            },
            {
                funcName: 'setTimeout handler*',
                library: defaultWebsite,
                line: 17,
                column: 15,
            },
        ],
    },
    {
        name: 'object access function with @ character',
        test: {
            message: 'Foo bar',
            stackTrace: `trace/obj["@abc"]@${defaultWebsite}:26:11
                trace@${defaultWebsite}:29:13
                setTimeout handler*@${defaultWebsite}:22:15`,
        },
        expectation: [
            {
                funcName: 'trace/obj["@abc"]',
                library: defaultWebsite,
                line: 26,
                column: 11,
            },
            {
                funcName: 'trace',
                library: defaultWebsite,
                line: 29,
                column: 13,
            },
            {
                funcName: 'setTimeout handler*',
                library: defaultWebsite,
                line: 22,
                column: 15,
            },
        ],
    },
    {
        name: 'Source code with @ character & @ in function name',
        test: {
            message: 'Foo bar',
            stackTrace: `trace/obj["@abc"]@file:///test@test.html:26:11
                    trace@file:///test@test.html:29:13
                    setTimeout handler*@file:///test@test.html:22:15`,
        },
        expectation: [
            {
                funcName: 'trace/obj["@abc"]',
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
                funcName: 'setTimeout handler*',
                library: `file:///test@test.html`,
                line: 22,
                column: 15,
            },
        ],
    },
];
