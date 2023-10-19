import { BacktraceReportSubmissionResult, BacktraceRequestHandler } from '@backtrace-labs/sdk-core';
import { IpcEvents } from '../../common/ipc/IpcEvents';
import { IpcRpc } from '../../common/ipc/IpcRpc';

export class IpcRequestHandler implements BacktraceRequestHandler {
    constructor(private readonly _ipc: IpcRpc) {}

    public postError(): never {
        throw new Error('Sending reports should be routed via IpcReportSubmission.');
    }

    public post<T>(submissionUrl: string, payload: string): Promise<BacktraceReportSubmissionResult<T>> {
        return this._ipc.invoke(IpcEvents.post, submissionUrl, payload);
    }
}
