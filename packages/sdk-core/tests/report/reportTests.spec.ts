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
});
