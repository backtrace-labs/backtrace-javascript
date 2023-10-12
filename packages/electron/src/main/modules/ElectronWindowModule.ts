import { BacktraceData, BacktraceModule, BacktraceModuleBindData, RawBreadcrumb } from '@backtrace-labs/sdk-core';
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

        rpc.on(IpcEvents.sendReport, async (event, data: BacktraceData, attachmentRefs: IpcAttachmentReference[]) => {
            data.attributes = {
                'electron.frameId': event.frameId,
                'electron.processId': event.processId,
                'electron.renderer': true,
                ...data.attributes,
            };

            const attachments = attachmentRefs.map((v) => new IpcAttachment(v.name, v.id, ipcTransport));
            return await reportSubmission.send(data, [...attachments, ...client.attachments]);
        });

        ipcTransport.on(
            IpcEvents.addBreadcrumb,
            async (event: Electron.IpcMainInvokeEvent, breadcrumb: RawBreadcrumb) => {
                client.breadcrumbs?.addBreadcrumb(breadcrumb.message, breadcrumb.level, breadcrumb.type, {
                    'electron.frameId': event.frameId,
                    'electron.processId': event.processId,
                    'electron.renderer': true,
                    ...breadcrumb.attributes,
                });
            },
        );
    }
}
