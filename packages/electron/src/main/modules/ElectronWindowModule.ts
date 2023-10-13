import {
    BacktraceData,
    BacktraceModule,
    BacktraceModuleBindData,
    RawBreadcrumb,
    SummedEvent,
} from '@backtrace-labs/sdk-core';
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
                ...this.getEventAttributes(event),
                ...data.attributes,
            };

            const attachments = attachmentRefs.map((v) => new IpcAttachment(v.name, v.id, ipcTransport));
            return await reportSubmission.send(data, [...attachments, ...client.attachments]);
        });

        rpc.on(IpcEvents.sendMetrics, async () => client.metrics?.send());

        ipcTransport.on(IpcEvents.addBreadcrumb, (event: Electron.IpcMainInvokeEvent, breadcrumb: RawBreadcrumb) => {
            client.breadcrumbs?.addBreadcrumb(breadcrumb.message, breadcrumb.level, breadcrumb.type, {
                ...this.getEventAttributes(event),
                ...breadcrumb.attributes,
            });
        });

        ipcTransport.on(IpcEvents.addSummedMetric, (event: Electron.IpcMainInvokeEvent, metric: SummedEvent) => {
            client.metrics?.addSummedEvent(metric.metricGroupValue, {
                ...this.getEventAttributes(event),
                ...metric.attributes,
            });
        });
    }

    private getEventAttributes(event: Electron.IpcMainInvokeEvent) {
        return {
            'electron.frameId': event.frameId,
            'electron.processId': event.processId,
            'electron.process': 'renderer',
        };
    }
}
