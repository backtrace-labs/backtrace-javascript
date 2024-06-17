import { MetricsQueue, SummedEvent } from '@backtrace/sdk-core';
import { IpcRpc, IpcTransport } from '../../common';
import { IpcEvents } from '../../common/ipc/IpcEvents';

export class IpcSummedMetricsQueue implements MetricsQueue<SummedEvent> {
    public readonly total = 0;
    public readonly submissionUrl = '';
    public readonly maximumEvents = -1;

    constructor(
        private readonly _ipcTransport: IpcTransport,
        private readonly _ipcRpc: IpcRpc,
    ) {}

    public add(event: SummedEvent): void {
        this._ipcTransport.emit(IpcEvents.addSummedMetric, event);
    }

    public send(): Promise<void> {
        return this._ipcRpc.invoke(IpcEvents.sendMetrics);
    }
}
