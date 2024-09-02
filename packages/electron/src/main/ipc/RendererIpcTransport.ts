/* eslint-disable @typescript-eslint/no-explicit-any */
import { ipcRenderer } from 'electron';
import { IpcTransport } from '../../common/ipc/IpcTransport.js';

export class RendererIpcTransport implements IpcTransport {
    public emit(event: string, ...args: unknown[]) {
        ipcRenderer.send(event, ...args);
        return true;
    }

    public on(event: string, callback: (...args: any[]) => unknown) {
        ipcRenderer.on(event, callback);
        return this;
    }

    public once(event: string, callback: (...args: any[]) => unknown) {
        ipcRenderer.once(event, callback);
        return this;
    }

    public off(event: string, callback: (...args: any[]) => unknown) {
        ipcRenderer.off(event, callback);
        return this;
    }
}
