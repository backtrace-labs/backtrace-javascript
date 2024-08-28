import { FileAttachmentsManager, FileBreadcrumbsStorage, NodeFileSystem } from '@backtrace/node';
import {
    BacktraceData,
    BacktraceModule,
    BacktraceModuleBindData,
    RawBreadcrumb,
    SessionFiles,
    SubmissionUrlInformation,
    SummedEvent,
} from '@backtrace/sdk-core';
import type { BacktraceDatabase } from '@backtrace/sdk-core/lib/modules/database/BacktraceDatabase';
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
        const { requestHandler, reportSubmission, client, attributeManager } = bindData;

        const getSyncData = (): SyncData => ({
            sessionId: client.sessionId,
        });

        const rpc = new MainIpcRpcHandler();
        const ipcTransport = new MainIpcTransportHandler();

        rpc.on(IpcEvents.post, async (_: unknown, url: string, dataJson: string) => {
            return requestHandler.post(url, dataJson);
        });

        rpc.on(IpcEvents.sendReport, async (event, data: BacktraceData, attachmentRefs: IpcAttachmentReference[]) => {
            const { attributes, annotations } = attributeManager.get();

            data.attributes = {
                ...attributes,
                ...this.getEventAttributes(event),
                ...data.attributes,
            };

            data.annotations = {
                ...annotations,
                ...data.annotations,
            };

            const attachments = attachmentRefs.map(
                (v) => new IpcAttachment(v.name, v.id, new WindowIpcTransport(event.sender)),
            );

            return await reportSubmission.send(data, [...attachments, ...client.attachments]);
        });

        rpc.on(IpcEvents.sendAttachment, async (event, rxid: string, attachmentRef: IpcAttachmentReference) => {
            const attachment = new IpcAttachment(
                attachmentRef.name,
                attachmentRef.id,
                new WindowIpcTransport(event.sender),
            );
            return await reportSubmission.sendAttachment(rxid, attachment);
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

        const { options, attributeManager, sessionFiles, fileSystem, database } = this._bindData;

        if (options.database?.captureNativeCrashes) {
            if (options.database.path) {
                app.setPath('crashDumps', options.database.path);
            }

            crashReporter.start({
                submitURL: SubmissionUrlInformation.toMinidumpSubmissionUrl(options.url),
                uploadToServer: true,
                extra: {
                    ...toStringDictionary(attributeManager.get('scoped').attributes),
                    'error.type': 'Crash',
                },
            });

            attributeManager.attributeEvents.on('scoped-attributes-updated', ({ attributes }) => {
                const dict = toStringDictionary(attributes);
                for (const key in dict) {
                    crashReporter.addExtraParameter(key, dict[key]);
                }
            });

            if (sessionFiles && database && fileSystem) {
                const lockId = sessionFiles.lockPreviousSessions();
                this.sendPreviousCrashAttachments(database, sessionFiles, fileSystem as NodeFileSystem).finally(
                    () => lockId && sessionFiles.unlockPreviousSessions(lockId),
                );
            }
        }
    }

    private getEventAttributes(event: Electron.IpcMainInvokeEvent) {
        return {
            'electron.frameId': event.frameId,
            'electron.processId': event.processId,
            'electron.process': 'renderer',
        };
    }

    private async sendPreviousCrashAttachments(
        database: BacktraceDatabase,
        session: SessionFiles,
        fileSystem: NodeFileSystem,
    ) {
        // Sort crashes and sessions by timestamp descending
        const crashes = crashReporter.getUploadedReports().sort((a, b) => b.date.getTime() - a.date.getTime());
        const previousSessions = session.getPreviousSessions().sort((a, b) => b.timestamp - a.timestamp);

        for (const crash of crashes) {
            const rxid = this.getCrashRxid(crash.id);
            if (!rxid) {
                continue;
            }

            try {
                // Get first session that happened before the crash
                const session = previousSessions.find((p) => p.timestamp < crash.date.getTime());
                // If there is no such session, there won't be any other sessions
                if (!session) {
                    break;
                }

                const crashLock = session.getFileName(`electron-crash-lock-${rxid}`);
                // If crash lock exists, do not attempt to add attachments twice
                if (await fileSystem.exists(crashLock)) {
                    continue;
                }

                const fileAttachmentsManager = FileAttachmentsManager.createFromSession(session, fileSystem);
                const sessionAttachments = [
                    ...FileBreadcrumbsStorage.getSessionAttachments(session),
                    ...(await fileAttachmentsManager.get()),
                ];

                for (const attachment of sessionAttachments) {
                    database.addAttachment(rxid, attachment, session.sessionId);
                }

                // Write an empty crash lock, so we know that this crash is already taken care of
                await fileSystem.writeFile(crashLock, '');
            } catch {
                // Do nothing, skip the report
            }
        }

        await database.send();
    }

    private getCrashRxid(crashId: string): string | undefined {
        try {
            return JSON.parse(crashId)._rxid;
        } catch {
            const rxidRegex = /"_rxid":\s*"([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})"/i;
            return crashId.match(rxidRegex)?.[1];
        }
    }
}

function toStringDictionary(record: Record<string, unknown>): Record<string, string> {
    return Object.keys(record).reduce(
        (obj, key) => {
            obj[key] = record[key]?.toString() ?? '';
            return obj;
        },
        {} as Record<string, string>,
    );
}
