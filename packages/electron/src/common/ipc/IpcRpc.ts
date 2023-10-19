/* eslint-disable @typescript-eslint/no-explicit-any */
import { Event } from 'electron';

export interface IpcRpcCaller {
    invoke<T>(event: string, ...args: unknown[]): Promise<T>;
}

export interface IpcRpcHandler {
    on(event: string, callback: (event: Event, ...args: any[]) => Promise<unknown>): this;
    once(event: string, callback: (event: Event, ...args: any[]) => Promise<unknown>): this;
}

export interface IpcRpc extends IpcRpcCaller, IpcRpcHandler {}

export interface SyncIpcRpcCaller {
    invokeSync<T>(event: string, ...args: unknown[]): T;
}

export interface SyncIpcRpcHandler {
    onSync(event: string, callback: (event: Event, ...args: any[]) => unknown): this;
    onceSync(event: string, callback: (event: Event, ...args: any[]) => unknown): this;
}

export interface IpcRpcEvent extends Event {
    readonly replyTo?: string;
}
