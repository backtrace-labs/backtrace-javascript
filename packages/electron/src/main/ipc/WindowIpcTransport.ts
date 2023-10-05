import { BrowserWindow, ipcMain } from 'electron';
import { IpcTransport } from '../../common';

export class WindowIpcTransport implements IpcTransport {
    constructor(private readonly _window: BrowserWindow) {}

    public emit(event: string, ...args: unknown[]): boolean {
        this._window.webContents.send(event, ...args);
        return true;
    }

    public on(event: string, callback: (...args: any[]) => unknown) {
        ipcMain.on(event, callback);
        return this;
    }

    public once(event: string, callback: (...args: any[]) => unknown) {
        ipcMain.once(event, callback);
        return this;
    }

    public off(event: string, callback: (...args: any[]) => unknown) {
        ipcMain.off(event, callback);
        return this;
    }
}
