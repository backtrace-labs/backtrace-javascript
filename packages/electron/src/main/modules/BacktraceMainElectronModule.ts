import {
    BacktraceData,
    BacktraceModule,
    BacktraceModuleBindData,
    RawBreadcrumb,
    SummedEvent,
} from '@backtrace-labs/sdk-core';
import { IpcAttachmentReference } from '../../common/ipc/IpcAttachmentReference';
import { IpcEvents } from '../../common/ipc/IpcEvents';
import { SyncData } from '../../common/models/SyncData';
import { MainIpcRpcHandler } from '../ipc/MainIpcRpcHandler';
import { MainIpcTransportHandler } from '../ipc/MainIpcTransportHandler';
import { WindowIpcTransport } from '../ipc/WindowIpcTransport';
import { IpcAttachment } from './IpcAttachment';

export class BacktraceMainElectronModule implements BacktraceModule {
    public bind({ requestHandler, reportSubmission, client }: BacktraceModuleBindData): void {
        const getSyncData = (): SyncData => ({
            sessionId: client.sessionId,
        });

        const rpc = new MainIpcRpcHandler();
        const ipcTransport = new MainIpcTransportHandler();

        rpc.on(IpcEvents.post, async (_: unknown, url: string, dataJson: string) => {
            return requestHandler.post(url, dataJson);
        });

        rpc.on(IpcEvents.sendReport, async (event, data: BacktraceData, attachmentRefs: IpcAttachmentReference[]) => {
            data.attributes = {
                ...this.getEventAttributes(event),
                ...data.attributes,
            };

            const attachments = attachmentRefs.map(
                (v) => new IpcAttachment(v.name, v.id, new WindowIpcTransport(event.sender)),
            );

            return await reportSubmission.send(data, [...attachments, ...client.attachments]);
        });

        rpc.on(IpcEvents.sendMetrics, async () => client.metrics?.send());

        rpc.on(IpcEvents.sync, () => Promise.resolve(getSyncData()));

        rpc.onSync(IpcEvents.sync, (event: Electron.IpcMainInvokeEvent) => {
            event.returnValue = getSyncData();
        });

        ipcTransport.on(IpcEvents.sync, (event) => {
            const transport = new WindowIpcTransport(event.sender);
            transport.emit(IpcEvents.sync, getSyncData());
        });

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
