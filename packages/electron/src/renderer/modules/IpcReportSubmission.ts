import {
    BacktraceAttachment,
    BacktraceData,
    BacktraceReportSubmission,
    BacktraceReportSubmissionResult,
    BacktraceSubmissionResponse,
} from '@backtrace-labs/sdk-core';
import { IpcEvents } from '../../common/ipc/IpcEvents';
import { IpcRpc } from '../../common/ipc/IpcRpc';

export class IpcReportSubmission implements BacktraceReportSubmission {
    constructor(private readonly _ipc: IpcRpc) {}

    public send(
        data: BacktraceData,
        attachments: BacktraceAttachment<unknown>[],
    ): Promise<BacktraceReportSubmissionResult<BacktraceSubmissionResponse>> {
        // TODO: Make attachments works
        return this._ipc.invoke(IpcEvents.sendReport, data, []);
    }
}
