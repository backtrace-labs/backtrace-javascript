/* eslint-disable @typescript-eslint/no-explicit-any */
export interface IpcTransportEmitter {
    emit(event: string, ...args: unknown[]): boolean;
}

export interface IpcTransportHandler {
    on(event: string, callback: (event: Event, ...args: any[]) => unknown): this;
    once(event: string, callback: (event: Event, ...args: any[]) => unknown): this;
    off(event: string, callback: (event: Event, ...args: any[]) => unknown): this;
}

export interface IpcTransport extends IpcTransportEmitter, IpcTransportHandler {}
