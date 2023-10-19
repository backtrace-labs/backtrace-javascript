/* eslint-disable @typescript-eslint/no-explicit-any */
import { IpcMainInvokeEvent, ipcMain } from 'electron';
import { IpcTransportHandler } from '../../common';

export class MainIpcTransportHandler implements IpcTransportHandler {
    public on(event: string, callback: (event: IpcMainInvokeEvent, ...args: any[]) => unknown) {
        ipcMain.on(event, callback);
        return this;
    }

    public once(event: string, callback: (event: IpcMainInvokeEvent, ...args: any[]) => unknown) {
        ipcMain.once(event, callback);
        return this;
    }

    public off(event: string, callback: (event: IpcMainInvokeEvent, ...args: any[]) => unknown) {
        ipcMain.off(event, callback);
        return this;
    }
}
