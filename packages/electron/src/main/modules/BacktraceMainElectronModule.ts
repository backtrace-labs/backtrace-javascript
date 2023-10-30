import {
    BacktraceData,
    BacktraceModule,
    BacktraceModuleBindData,
    RawBreadcrumb,
    SubmissionUrlInformation,
    SummedEvent,
} from '@backtrace/sdk-core';
import { app, crashReporter } from 'electron';
import { IpcAttachmentReference } from '../../common/ipc/IpcAttachmentReference';
import { IpcEvents } from '../../common/ipc/IpcEvents';
import { SyncData } from '../../common/models/SyncData';
import { MainIpcRpcHandler } from '../ipc/MainIpcRpcHandler';
import { MainIpcTransportHandler } from '../ipc/MainIpcTransportHandler';
import { WindowIpcTransport } from '../ipc/WindowIpcTransport';
import { IpcAttachment } from './IpcAttachment';

export class BacktraceMainElectronModule implements BacktraceModule {
    private _bindData?: BacktraceModuleBindData;

    public bind(bindData: BacktraceModuleBindData): void {
        const { requestHandler, reportSubmission, client } = bindData;

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

        rpc.on(IpcEvents.ping, () => Promise.resolve('pong'));

        rpc.on(IpcEvents.sync, () => Promise.resolve(getSyncData()));

        rpc.onSync(IpcEvents.sync, (event: Electron.IpcMainEvent) => {
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

        this._bindData = bindData;
    }

    public initialize(): void {
        if (!this._bindData) {
            return;
        }

        const { options, attributeManager } = this._bindData;
        if (options.database?.captureNativeCrashes) {
            if (options.database.path) {
                app.setPath('crashDumps', options.database.path);
            }

            crashReporter.start({
                submitURL: SubmissionUrlInformation.toMinidumpSubmissionUrl(options.url),
                uploadToServer: true,
                extra: toStringDictionary(attributeManager.get('scoped').attributes),
            });

            attributeManager.attributeEvents.on('scoped-attributes-updated', ({ attributes }) => {
                const dict = toStringDictionary(attributes);
                for (const key in dict) {
                    crashReporter.addExtraParameter(key, dict[key]);
                }
            });
        }
    }

    private getEventAttributes(event: Electron.IpcMainInvokeEvent) {
        return {
            'electron.frameId': event.frameId,
            'electron.processId': event.processId,
            'electron.process': 'renderer',
        };
    }
}

function toStringDictionary(record: Record<string, unknown>): Record<string, string> {
    return Object.keys(record).reduce((obj, key) => {
        obj[key] = record[key]?.toString() ?? '';
        return obj;
    }, {} as Record<string, string>);
}
