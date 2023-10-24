import { BacktraceCoreClientBuilder } from '@backtrace/sdk-core';
import { IpcEvents } from '../common/ipc/IpcEvents';
import { SyncData } from '../common/models/SyncData';
import { getIpcRpc } from './ipc/getIpcRpc';
import { getIpcTransport } from './ipc/getIpcTransport';
import { ConstSessionProvider } from './modules/ConstSessionProvider';
import { IpcAsyncSessionProvider } from './modules/IpcAsyncSessionProvider';
import { IpcBreadcrumbsStorage } from './modules/IpcBreadcrumbsStorage';
import { IpcReportSubmission } from './modules/IpcReportSubmission';
import { IpcRequestHandler } from './modules/IpcRequestHandler';
import { IpcSummedMetricsQueue } from './modules/IpcSummedMetricsQueue';
import { StubMetricsQueue } from './modules/StubMetricsQueue';

export interface AddBacktraceElectronOptions {
    readonly synchronous?: boolean;
}

export function addBacktraceElectron<T extends BacktraceCoreClientBuilder>(
    builder: T,
    options?: AddBacktraceElectronOptions,
): T {
    const ipcTransport = getIpcTransport();
    const ipcRpc = getIpcRpc();

    // Sanity check - this will throw if ping isn't listened on.
    ipcRpc
        .invoke(IpcEvents.ping)
        .catch((err) =>
            console.error(
                'Cannot connect to Backtrace in the main process.\n\n',
                'Make sure to initialize @backtrace/electron in the main process first.\n\n',
                err,
            ),
        );

    builder
        .useRequestHandler(new IpcRequestHandler(ipcRpc))
        .useReportSubmission(new IpcReportSubmission(ipcRpc, ipcTransport))
        .useBreadcrumbsStorage(new IpcBreadcrumbsStorage(ipcTransport))
        .useSummedMetricsQueue(new IpcSummedMetricsQueue(ipcTransport, ipcRpc))
        .useUniqueMetricsQueue(new StubMetricsQueue());

    if (options?.synchronous) {
        const syncData = ipcRpc.invokeSync<SyncData>(IpcEvents.sync);
        builder.useSessionProvider(new ConstSessionProvider(syncData.sessionId));
    } else {
        builder.useSessionProvider(new IpcAsyncSessionProvider(ipcTransport));
        ipcTransport.emit(IpcEvents.sync);
    }

    return builder;
}
