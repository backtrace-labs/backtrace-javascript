import {
    BacktraceAttachment,
    BacktraceAttachmentResponse,
    BacktraceData,
    BacktraceReportSubmission,
    BacktraceReportSubmissionResult,
    BacktraceSubmissionResponse,
    IdGenerator,
    jsonEscaper,
} from '@backtrace/sdk-core';
import { IpcTransport } from '../../common/index.js';
import { IpcAttachmentReference } from '../../common/ipc/IpcAttachmentReference.js';
import { IpcEvents } from '../../common/ipc/IpcEvents.js';
import { IpcRpc } from '../../common/ipc/IpcRpc.js';
import { WritableIpcStream } from '../ipc/WritableIpcStream.js';

export class IpcReportSubmission implements BacktraceReportSubmission {
    constructor(
        private readonly _ipcRpc: IpcRpc,
        private readonly _ipcTransport: IpcTransport,
    ) {}

    public send(
        data: BacktraceData,
        attachments: BacktraceAttachment<unknown>[],
    ): Promise<BacktraceReportSubmissionResult<BacktraceSubmissionResponse>> {
        const references: IpcAttachmentReference[] = [];

        // IPC breadcrumbs storage will set this to -1.
        // Let main add breadcrumb.lastId if it's less than 0.
        if ((data.attributes['breadcrumbs.lastId'] as number) < 0) {
            delete data.attributes['breadcrumbs.lastId'];
        }

        for (const attachment of attachments) {
            const id = this.pipeAttachment(attachment);
            if (!id) {
                continue;
            }

            references.push({
                id,
                name: attachment.name,
            });
        }

        return this._ipcRpc.invoke(IpcEvents.sendReport, data, references);
    }

    public async sendAttachment(
        rxid: string,
        attachment: BacktraceAttachment,
    ): Promise<BacktraceReportSubmissionResult<BacktraceAttachmentResponse>> {
        const id = this.pipeAttachment(attachment);
        if (!id) {
            return BacktraceReportSubmissionResult.ReportSkipped();
        }

        return this._ipcRpc.invoke(IpcEvents.sendAttachment, rxid, { id, name: attachment.name });
    }

    private pipeAttachment(attachment: BacktraceAttachment) {
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
            return undefined;
        }

        return id;
    }
}
