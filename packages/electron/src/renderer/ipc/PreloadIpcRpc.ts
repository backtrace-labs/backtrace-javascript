import { IpcRpc } from '../../common/ipc/IpcRpc';

declare global {
    interface Window {
        BACKTRACE_IPC_RPC: IpcRpc;
    }
}

export const PreloadIpcRpc = window.BACKTRACE_IPC_RPC;
