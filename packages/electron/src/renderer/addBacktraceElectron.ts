import { BacktraceCoreClientBuilder } from '@backtrace-labs/sdk-core';
import { getIpcRpc } from './ipc/getIpcRpc';
import { getIpcTransport } from './ipc/getIpcTransport';
import { IpcBreadcrumbsStorage } from './modules/IpcBreadcrumbsStorage';
import { IpcReportSubmission } from './modules/IpcReportSubmission';
import { IpcRequestHandler } from './modules/IpcRequestHandler';
import { IpcSummedMetricsQueue } from './modules/IpcSummedMetricsQueue';
import { StubMetricsQueue } from './modules/StubMetricsQueue';

export function addBacktraceElectron<T extends BacktraceCoreClientBuilder>(builder: T): T {
    const ipcTransport = getIpcTransport();
    const ipcRpc = getIpcRpc();

    return builder
        .useRequestHandler(new IpcRequestHandler(ipcRpc))
        .useReportSubmission(new IpcReportSubmission(ipcRpc, ipcTransport))
        .useBreadcrumbsStorage(new IpcBreadcrumbsStorage(ipcTransport))
        .useSummedMetricsQueue(new IpcSummedMetricsQueue(ipcTransport, ipcRpc))
        .useUniqueMetricsQueue(new StubMetricsQueue());
}
