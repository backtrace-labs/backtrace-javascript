import { BacktraceAttachment, BreadcrumbsStorage, RawBreadcrumb } from '@backtrace/sdk-core';
import { IpcTransport } from '../../common/index.js';
import { IpcEvents } from '../../common/ipc/IpcEvents.js';

export class IpcBreadcrumbsStorage implements BreadcrumbsStorage {
    constructor(private readonly _ipcTransport: IpcTransport) {}

    public static factory(transport: IpcTransport) {
        return () => new IpcBreadcrumbsStorage(transport);
    }

    public get lastBreadcrumbId(): number {
        return -1;
    }

    public add(rawBreadcrumb: RawBreadcrumb): number {
        this._ipcTransport.emit(IpcEvents.addBreadcrumb, rawBreadcrumb);
        return -1;
    }

    public getAttachments(): BacktraceAttachment<unknown>[] {
        return [];
    }
}
