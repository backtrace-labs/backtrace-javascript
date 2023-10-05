export interface IpcTransport {
    emit(event: string, ...args: unknown[]): boolean;
    on(event: string, callback: (event: Event, ...args: any[]) => unknown): this;
    once(event: string, callback: (event: Event, ...args: any[]) => unknown): this;
    off(event: string, callback: (event: Event, ...args: any[]) => unknown): this;
}
