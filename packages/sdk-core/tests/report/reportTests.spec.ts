import assert from 'assert';
import { BacktraceReport } from '../../src/index.js';
import { BacktraceReportStackTraceInfo } from '../../src/model/report/BacktraceReportStackTraceInfo.js';

function isStackTraceInfo(obj: unknown): obj is BacktraceReportStackTraceInfo {
    return typeof obj === 'object' && !!obj && 'stack' in obj && 'message' in obj;
}

describe('Backtrace report generation tests', () => {
    describe('Message report', () => {
        const testMessage = 'test';
        const report = new BacktraceReport(testMessage);
        it('Report message should be set', () => {
            assert(isStackTraceInfo(report.stackTrace.main));
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
            assert(isStackTraceInfo(report.stackTrace.main));
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

            assert(isStackTraceInfo(errorReport.stackTrace[name]));
            expect(errorReport.stackTrace[name].message).toEqual('');

            assert(isStackTraceInfo(messageReport.stackTrace[name]));
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

    describe('error annotation cause unwrapping', () => {
        type ErrorWithCause = Error & { cause?: unknown };

        /**
         * This function is a helper to fix a potential type issue between different
         * version of TypeScript's built-in Error type, which may or may not include the `cause` property.
         */
        function createError(message: string, cause?: unknown): ErrorWithCause {
            const error: ErrorWithCause = new Error(message);
            error.cause = cause;
            return error;
        }

        it('should include cause in error annotation', () => {
            const causeMessage = 'cause';
            const cause = new Error(causeMessage);
            const error = createError('top level', cause);
            const report = new BacktraceReport(error);

            const annotation = report.annotations['error'] as ErrorWithCause;
            const causeAnnotation = annotation.cause as ErrorWithCause;
            expect(causeAnnotation.message).toBe(causeMessage);
            expect(causeAnnotation.name).toBe('Error');
        });

        it('should unwrap nested cause chain', () => {
            const root = new Error('root');
            const mid = createError('mid', root);
            const top = createError('top', mid);
            const report = new BacktraceReport(top);

            const annotation = report.annotations['error'] as ErrorWithCause;
            const midAnnotation = annotation.cause as ErrorWithCause;
            const rootAnnotation = midAnnotation.cause as ErrorWithCause;
            expect(midAnnotation.message).toBe(mid.message);
            expect(rootAnnotation.message).toBe(root.message);
            expect(rootAnnotation.cause).toBeUndefined();
        });

        it('should handle circular cause without stack overflow', () => {
            const topLevelError = createError('error a');
            const cause = createError('error b');
            topLevelError.cause = cause;
            cause.cause = topLevelError;

            const report = new BacktraceReport(topLevelError);

            const annotation = report.annotations['error'] as ErrorWithCause;
            const causeAnnotation = annotation.cause as ErrorWithCause;
            expect(causeAnnotation.message).toBe(cause.message);
            // circular reference back to `a` — not recursed, falls through to string fallback
            expect(causeAnnotation.cause).toEqual({ value: 'Error: error a' });
        });

        it('should handle self-referencing cause without stack overflow', () => {
            const error = createError('self');
            error.cause = error;

            const report = new BacktraceReport(error);

            const annotation = report.annotations['error'] as ErrorWithCause;
            // cause points to itself — not recursed, falls through to string fallback
            expect(annotation.cause).toEqual({ value: 'Error: self' });
        });

        it('should handle non-Error cause as string value', () => {
            const error = createError('fail', 'timeout');
            const report = new BacktraceReport(error);

            const annotation = report.annotations['error'] as ErrorWithCause;
            expect(annotation.cause).toEqual({ value: 'timeout' });
        });

        it('should handle non-Error object cause as string value', () => {
            const error = createError('fail', { code: 'ENOENT' });
            const report = new BacktraceReport(error);

            const annotation = report.annotations['error'] as ErrorWithCause;
            expect(annotation.cause).toEqual({ code: 'ENOENT' });
        });

        it('should set cause to undefined when no cause exists', () => {
            const error = new Error('no cause');
            const report = new BacktraceReport(error);

            const annotation = report.annotations['error'] as ErrorWithCause;
            expect(annotation.cause).toBeUndefined();
        });
    });
});
