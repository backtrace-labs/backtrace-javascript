import { BacktraceData, BacktraceModule, BacktraceModuleBindData } from '@backtrace-labs/sdk-core';
import { BrowserWindow } from 'electron';
import { IpcEvents } from '../../common/ipc/IpcEvents';
import { WindowIpcRpc } from '../ipc/WindowIpcRpc';

export class ElectronWindowModule implements BacktraceModule {
    constructor(private readonly _window: BrowserWindow) {}

    public bind({ requestHandler, reportSubmission }: BacktraceModuleBindData): void {
        const rpc = new WindowIpcRpc(this._window);

        rpc.on(IpcEvents.post, async (_: unknown, url: string, dataJson: string) => {
            return requestHandler.post(url, dataJson);
        });

        rpc.on(IpcEvents.sendReport, async (_: unknown, data: BacktraceData) => {
            // TODO: Make attachments work
            return reportSubmission.send(data, []);
        });
    }
}
