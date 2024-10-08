import { BacktraceSessionProvider, IdGenerator } from '@backtrace/sdk-core';
import { IpcTransport } from '../../common/index.js';
import { IpcEvents } from '../../common/ipc/IpcEvents.js';
import { SyncData } from '../../common/models/SyncData.js';

export class IpcAsyncSessionProvider implements BacktraceSessionProvider {
    private _sessionId = IdGenerator.uuid();

    public readonly newSession = true;

    public get sessionId() {
        return this._sessionId;
    }

    constructor(ipcTransport: IpcTransport) {
        ipcTransport.on(IpcEvents.sync, (_: unknown, data: SyncData) => {
            this._sessionId = data.sessionId;
        });
    }

    public get lastActive(): number {
        return 0;
    }

    public afterMetricsSubmission(): void {
        // Do nothing
    }

    public shouldSend(): boolean {
        return true;
    }
}
