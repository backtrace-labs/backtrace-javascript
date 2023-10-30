import { BacktraceReportSubmissionResult, BacktraceRequestHandler } from '../../src';

export const testHttpClient: BacktraceRequestHandler = {
    post: jest.fn().mockResolvedValue(Promise.resolve(BacktraceReportSubmissionResult.Ok('Ok'))),
    postError: jest.fn().mockResolvedValue(Promise.resolve()),
};
