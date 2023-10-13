import { Event, ipcRenderer } from 'electron';
import { IpcRpc, IpcRpcEvent, SyncIpcRpcCaller } from '../../common/ipc/IpcRpc';

export class RendererIpcRpc implements IpcRpc, SyncIpcRpcCaller {
    public on(event: string, callback: (event: Event, ...args: any[]) => Promise<any>): this {
        ipcRenderer.on(event, RendererIpcRpc.handleRpcCall(callback));
        return this;
    }

    public once(event: string, callback: (event: Event, ...args: any[]) => Promise<any>): this {
        ipcRenderer.once(event, RendererIpcRpc.handleRpcCall(callback));
        return this;
    }

    public invoke<T>(event: string, ...args: unknown[]): Promise<T> {
        return ipcRenderer.invoke(event, ...args);
    }

    public invokeSync<T>(event: string, ...args: unknown[]): T {
        return ipcRenderer.sendSync(event, ...args);
    }

    private static handleRpcCall(callback: (event: Event, ...args: any[]) => Promise<any>) {
        return async (event: IpcRpcEvent, args: any[]) => {
            if (!event.replyTo) {
                throw new Error('replyTo is missing from event');
            }

            try {
                const result = await callback(event, ...args);
                ipcRenderer.send(event.replyTo, result);
            } catch (err) {
                ipcRenderer.send(`${event.replyTo}_error`, err);
            }
        };
    }
}
