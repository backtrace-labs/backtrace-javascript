import { Event } from 'electron';

export interface IpcRpc {
    on(event: string, callback: (event: Event, ...args: any[]) => Promise<any>): this;
    once(event: string, callback: (event: Event, ...args: any[]) => Promise<any>): this;
    invoke<T>(event: string, ...args: unknown[]): Promise<T>;
}

export interface SyncIpcRpcCaller {
    invokeSync<T>(event: string, ...args: unknown[]): T;
}

export interface SyncIpcRpcHandler {
    onSync(event: string, callback: (event: Event, ...args: any[]) => any): this;
    onceSync(event: string, callback: (event: Event, ...args: any[]) => any): this;
}

export interface IpcRpcEvent extends Event {
    readonly replyTo?: string;
}
