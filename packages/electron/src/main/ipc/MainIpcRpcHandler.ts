import { IpcMainInvokeEvent, ipcMain } from 'electron';
import { IpcRpcHandler, SyncIpcRpcHandler } from '../../common/ipc/IpcRpc';

export class MainIpcRpcHandler implements IpcRpcHandler, SyncIpcRpcHandler {
    public on(event: string, callback: (event: IpcMainInvokeEvent, ...args: any[]) => Promise<any>): this {
        ipcMain.handle(event, callback);
        return this;
    }

    public once(event: string, callback: (event: IpcMainInvokeEvent, ...args: any[]) => Promise<any>): this {
        ipcMain.handleOnce(event, callback);
        return this;
    }

    public onSync(event: string, callback: (event: IpcMainInvokeEvent, ...args: any[]) => any): this {
        ipcMain.on(event, callback);
        return this;
    }

    public onceSync(event: string, callback: (event: IpcMainInvokeEvent, ...args: any[]) => any): this {
        ipcMain.once(event, callback);
        return this;
    }
}
