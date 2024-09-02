/* eslint-disable @typescript-eslint/no-explicit-any */
import { IpcMainEvent, IpcMainInvokeEvent, ipcMain } from 'electron';
import { IpcRpcHandler, SyncIpcRpcHandler } from '../../common/ipc/IpcRpc.js';

export class MainIpcRpcHandler implements IpcRpcHandler, SyncIpcRpcHandler {
    public on(event: string, callback: (event: IpcMainInvokeEvent, ...args: any[]) => Promise<unknown>): this {
        ipcMain.handle(event, callback);
        return this;
    }

    public once(event: string, callback: (event: IpcMainInvokeEvent, ...args: any[]) => Promise<unknown>): this {
        ipcMain.handleOnce(event, callback);
        return this;
    }

    public onSync(event: string, callback: (event: IpcMainEvent, ...args: any[]) => unknown): this {
        ipcMain.on(event, callback);
        return this;
    }

    public onceSync(event: string, callback: (event: IpcMainEvent, ...args: any[]) => unknown): this {
        ipcMain.once(event, callback);
        return this;
    }
}
