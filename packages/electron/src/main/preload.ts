import { contextBridge } from 'electron';
import { IpcTransport } from '../common';
import { IpcRpc, SyncIpcRpcCaller } from '../common/ipc/IpcRpc';
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
const ipcRpcApi: IpcRpc & SyncIpcRpcCaller = {
    invoke(event, ...args) {
        return ipcRpc.invoke(event, ...args);
    },
    on(event, callback) {
        return ipcRpc.on(event, callback);
    },
    once(event, callback) {
        return ipcRpc.once(event, callback);
    },
    invokeSync(event, callback) {
        return ipcRpc.invokeSync(event, callback);
    },
};

contextBridge.exposeInMainWorld('BACKTRACE_IPC', ipcTransportApi);
contextBridge.exposeInMainWorld('BACKTRACE_IPC_RPC', ipcRpcApi);
