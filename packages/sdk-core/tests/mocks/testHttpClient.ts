import { BacktraceReportSubmissionResult, BacktraceRequestHandler } from '../../src/index.js';

export const testHttpClient: BacktraceRequestHandler = {
    post: jest.fn().mockResolvedValue(Promise.resolve(BacktraceReportSubmissionResult.Ok('Ok'))),
    postError: jest.fn().mockResolvedValue(Promise.resolve()),
};
