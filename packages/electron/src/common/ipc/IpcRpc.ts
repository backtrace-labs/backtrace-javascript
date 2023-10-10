import { Event } from 'electron';

export interface IpcRpc {
    on(event: string, callback: (event: Event, ...args: any[]) => Promise<any>): this;
    once(event: string, callback: (event: Event, ...args: any[]) => Promise<any>): this;
    invoke<T>(event: string, ...args: unknown[]): Promise<T>;
}

export interface IpcRpcEvent extends Event {
    readonly replyTo?: string;
}
