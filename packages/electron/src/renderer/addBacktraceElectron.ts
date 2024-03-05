import { BacktraceCoreClientBuilder } from '@backtrace/sdk-core';
import { IpcEvents } from '../common/ipc/IpcEvents.js';
import { SyncData } from '../common/models/SyncData.js';
import { getIpcRpc } from './ipc/getIpcRpc.js';
import { getIpcTransport } from './ipc/getIpcTransport.js';
import { ConstSessionProvider } from './modules/ConstSessionProvider.js';
import { IpcAsyncSessionProvider } from './modules/IpcAsyncSessionProvider.js';
import { IpcBreadcrumbsStorage } from './modules/IpcBreadcrumbsStorage.js';
import { IpcReportSubmission } from './modules/IpcReportSubmission.js';
import { IpcRequestHandler } from './modules/IpcRequestHandler.js';
import { IpcSummedMetricsQueue } from './modules/IpcSummedMetricsQueue.js';
import { StubMetricsQueue } from './modules/StubMetricsQueue.js';

export interface AddBacktraceElectronOptions {
    /**
     * Data needs to be synchronized with the main process.
     * If this is set to `true`, this synchronization will be synchronous and blocking.
     * This can help with startup crashes not having the whole information, like session ID.
     *
     * **If Backtrace is not fully initialized on the main process, your application may hang with a white screen**.
     *
     * @default false
     */
    readonly synchronous?: boolean;
}

/**
 * Adds Backtrace Electron to the renderer client.
 * The submission process is overriden to be transferred over IPC to the main process.
 *
 * You need to initialize Electron Backtrace client in the main process before adding this.
 * Requires preload script to be included. See the README for more info.
 *
 * @param builder Backtrace client builder.
 * @param options Building options.
 * @returns Passed in builder.
 */
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
        .useBreadcrumbsStorage(IpcBreadcrumbsStorage.factory(ipcTransport))
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
