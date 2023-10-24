/* eslint-disable @typescript-eslint/no-explicit-any */
import { IdGenerator } from '@backtrace/sdk-core';
import { BrowserWindow, ipcMain, IpcMainInvokeEvent } from 'electron';
import { IpcRpc, SyncIpcRpcHandler } from '../../common/ipc/IpcRpc';

export class WindowIpcRpc implements IpcRpc, SyncIpcRpcHandler {
    constructor(private readonly _window: BrowserWindow) {}

    public on(event: string, callback: (event: IpcMainInvokeEvent, ...args: any[]) => Promise<unknown>): this {
        ipcMain.handle(event, callback);
        return this;
    }

    public once(event: string, callback: (event: IpcMainInvokeEvent, ...args: any[]) => Promise<unknown>): this {
        ipcMain.handleOnce(event, callback);
        return this;
    }

    public onSync(event: string, callback: (event: IpcMainInvokeEvent, ...args: any[]) => unknown): this {
        ipcMain.on(event, callback);
        return this;
    }

    public onceSync(event: string, callback: (event: IpcMainInvokeEvent, ...args: any[]) => unknown): this {
        ipcMain.once(event, callback);
        return this;
    }

    public invoke<T>(event: string, ...args: unknown[]): Promise<T> {
        const replyTo = IdGenerator.uuid();
        const replyToError = `${replyTo}_error`;

        return new Promise<T>((resolve, reject) => {
            const cleanup = () => {
                ipcMain.off(replyTo, handleResult);
                ipcMain.off(replyToError, handleError);
            };

            const handleResult = (_: unknown, res: T) => {
                cleanup();
                resolve(res);
            };

            const handleError = (_: unknown, err: unknown) => {
                cleanup();
                reject(err);
            };

            ipcMain.once(replyTo, handleResult);
            ipcMain.once(replyToError, handleError);

            this._window.webContents.send(event, ...args);
        });
    }
}
