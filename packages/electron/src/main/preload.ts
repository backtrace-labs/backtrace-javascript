import { contextBridge } from 'electron';
import { IpcTransport } from '../common';
import { IpcRpc } from '../common/ipc/IpcRpc';
import { RendererIpcRpc } from './ipc/RendererIpcRpc';
import { RendererIpcTransport } from './ipc/RendererIpcTransport';

const ipcTransport = new RendererIpcTransport();
const ipcTransportApi: IpcTransport = {
    emit(event, ...args) {
        return ipcTransport.emit(event, ...args);
    },
    on(event, callback) {
        return ipcTransport.on(event, callback);
    },
    once(event, callback) {
        return ipcTransport.once(event, callback);
    },
    off(event, callback) {
        return ipcTransport.off(event, callback);
    },
};

const ipcRpc = new RendererIpcRpc();
const ipcRpcApi: IpcRpc = {
    invoke(event, ...args) {
        return ipcRpc.invoke(event, ...args);
    },
    on(event, callback) {
        return ipcRpc.on(event, callback);
    },
    once(event, callback) {
        return ipcRpc.once(event, callback);
    },
};

contextBridge.exposeInMainWorld('BACKTRACE_IPC', ipcTransportApi);
contextBridge.exposeInMainWorld('BACKTRACE_IPC_RPC', ipcRpcApi);
