import {
    BacktraceAttachment,
    BacktraceData,
    BacktraceReportSubmission,
    BacktraceReportSubmissionResult,
    BacktraceSubmissionResponse,
    IdGenerator,
    jsonEscaper,
} from '@backtrace-labs/sdk-core';
import { IpcTransport } from '../../common';
import { IpcAttachmentReference } from '../../common/ipc/IpcAttachmentReference';
import { IpcEvents } from '../../common/ipc/IpcEvents';
import { IpcRpc } from '../../common/ipc/IpcRpc';
import { WritableIpcStream } from '../ipc/WritableIpcStream';

export class IpcReportSubmission implements BacktraceReportSubmission {
    constructor(private readonly _ipcRpc: IpcRpc, private readonly _ipcTransport: IpcTransport) {}

    public send(
        data: BacktraceData,
        attachments: BacktraceAttachment<unknown>[],
    ): Promise<BacktraceReportSubmissionResult<BacktraceSubmissionResponse>> {
        const references: IpcAttachmentReference[] = [];

        for (const attachment of attachments) {
            const id = IdGenerator.uuid() + '_' + attachment.name;
            const content = attachment.get();
            if (content instanceof Blob) {
                const stream = new WritableIpcStream(id, this._ipcTransport);
                content.stream().pipeTo(stream);
            } else if (content instanceof ReadableStream) {
                const stream = new WritableIpcStream(id, this._ipcTransport);
                content.pipeTo(stream);
            } else if (content != undefined) {
                const stream = new WritableIpcStream(id, this._ipcTransport);
                const writer = stream.getWriter();
                writer
                    .write(typeof content === 'string' ? content : JSON.stringify(content, jsonEscaper()))
                    .then(() => writer.releaseLock())
                    .then(() => stream.close());
            } else {
                continue;
            }

            references.push({
                id,
                name: attachment.name,
            });
        }

        return this._ipcRpc.invoke(IpcEvents.sendReport, data, references);
    }
}
