import { IpcTransport } from './IpcTransport';

export async function ipcHandshake(ipc: IpcTransport, event: string) {
    const promise = new Promise<void>((resolve) => {
        ipc.once(event, () => {
            ipc.emit(event);
            resolve();
        });
    });
    ipc.emit(event);
    return promise;
}
