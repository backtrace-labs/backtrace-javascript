import { BacktraceData, BacktraceModule, BacktraceModuleBindData } from '@backtrace-labs/sdk-core';
import { BrowserWindow } from 'electron';
import { IpcAttachmentReference } from '../../common/ipc/IpcAttachmentReference';
import { IpcEvents } from '../../common/ipc/IpcEvents';
import { WindowIpcRpc } from '../ipc/WindowIpcRpc';
import { WindowIpcTransport } from '../ipc/WindowIpcTransport';
import { IpcAttachment } from './IpcAttachment';

export class ElectronWindowModule implements BacktraceModule {
    constructor(private readonly _window: BrowserWindow) {}

    public bind({ requestHandler, reportSubmission, client }: BacktraceModuleBindData): void {
        const rpc = new WindowIpcRpc(this._window);
        const ipcTransport = new WindowIpcTransport(this._window);

        rpc.on(IpcEvents.post, async (_: unknown, url: string, dataJson: string) => {
            return requestHandler.post(url, dataJson);
        });

        rpc.on(
            IpcEvents.sendReport,
            async (_: unknown, data: BacktraceData, attachmentRefs: IpcAttachmentReference[]) => {
                const attachments = attachmentRefs.map((v) => new IpcAttachment(v.name, v.id, ipcTransport));
                return await reportSubmission.send(data, [...attachments, ...client.attachments]);
            },
        );
    }
}
