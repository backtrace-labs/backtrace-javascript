import { IpcTransport } from '../../common/ipc/IpcTransport';

declare global {
    interface Window {
        BACKTRACE_IPC: IpcTransport;
    }
}

export const PreloadIpcTransport = window.BACKTRACE_IPC;
