import { BacktraceReport } from '../../src';

describe('Backtrace report generation tests', () => {
    describe('Message report', () => {
        const testMessage = 'test';
        const report = new BacktraceReport(testMessage);
        it('Report message should be set', () => {
            expect(report.stackTrace.main.message).toBe(testMessage);
        });

        it('Stack trace should be defined', () => {
            expect(!!report.stackTrace.main).toBeTruthy();
        });

        it('Error.type attribute should be set to Message', () => {
            expect(report.attributes['error.type']).toBe('Message');
        });
    });

    describe('Error report', () => {
        const testError = new Error('foo');
        const report = new BacktraceReport(testError);
        it('Report message should be set', () => {
            expect(report.stackTrace.main.message).toBe(testError.message);
        });

        it('Stack trace should be defined', () => {
            expect(!!report.stackTrace.main).toBeTruthy();
        });

        it('Error.type attribute should be set to Message', () => {
            expect(report.attributes['error.type']).toBe('Exception');
        });
    });

    describe('addStackTrace', () => {
        const name = 'test-stack-name';
        const stack = 'test-stack';
        const message = 'test-stack-message';
        let errorReport: BacktraceReport;
        let messageReport: BacktraceReport;

        beforeEach(() => {
            errorReport = new BacktraceReport(new Error('foo'));
            messageReport = new BacktraceReport('test message');
        });

        afterEach(() => {
            errorReport = undefined as unknown as BacktraceReport;
            messageReport = undefined as unknown as BacktraceReport;
        });

        it('Should add a stack trace', () => {
            const expected = {
                stack,
                message,
            };
            errorReport.addStackTrace(name, stack, message);
            messageReport.addStackTrace(name, stack, message);
            expect(errorReport.stackTrace[name]).toEqual(expect.objectContaining(expected));
            expect(messageReport.stackTrace[name]).toEqual(expect.objectContaining(expected));
        });

        it('should default message to empty string', () => {
            errorReport.addStackTrace(name, stack);
            messageReport.addStackTrace(name, stack);

            expect(errorReport.stackTrace[name].message).toEqual('');
            expect(messageReport.stackTrace[name].message).toEqual('');
        });

        it('should overwrite existing threads', () => {
            const newStack = 'new-stack';
            const newMessage = 'new-message';

            const expected = {
                stack: newStack,
                message: newMessage,
            };

            errorReport.addStackTrace(name, stack, message);
            messageReport.addStackTrace(name, stack, message);

            // add new trace with same name
            errorReport.addStackTrace(name, newStack, newMessage);
            messageReport.addStackTrace(name, newStack, newMessage);

            expect(errorReport.stackTrace[name]).toEqual(expect.objectContaining(expected));
            expect(messageReport.stackTrace[name]).toEqual(expect.objectContaining(expected));
        });
    });
});
