import { BacktraceSubmissionStatus } from './BacktraceSubmissionStatus';

export class BacktraceReportSubmissionResult<T> {
    public get result(): T | undefined {
        return this._result;
    }

    public readonly status: BacktraceSubmissionStatus = 'Ok';

    private _result?: T;
    private constructor(response: T);
    private constructor(_status: BacktraceSubmissionStatus, _message?: string);
    private constructor(statusOrResponse: T | BacktraceSubmissionStatus, public readonly message?: string) {
        if (this.isSubmissionResponse(statusOrResponse)) {
            this.status = statusOrResponse;
            return;
        }
        this._result = statusOrResponse;
    }

    public static OnLimitReached<T>(): BacktraceReportSubmissionResult<T> {
        return new BacktraceReportSubmissionResult('Limit reached', 'Client report limit reached');
    }

    public static OnInternalServerError<T>(message: string): BacktraceReportSubmissionResult<T> {
        return new BacktraceReportSubmissionResult('Server Error', message);
    }

    public static OnUnknownError<T>(message: string): BacktraceReportSubmissionResult<T> {
        return new BacktraceReportSubmissionResult('Unknown', message);
    }
    public static OnNetworkingError<T>(message: string): BacktraceReportSubmissionResult<T> {
        return new BacktraceReportSubmissionResult('Network Error', message);
    }

    public static Ok<T>(response: T) {
        return new BacktraceReportSubmissionResult<T>(response);
    }

    private isSubmissionResponse(
        statusOrResponse: T | BacktraceSubmissionStatus,
    ): statusOrResponse is BacktraceSubmissionStatus {
        return typeof statusOrResponse === 'string';
    }
}
