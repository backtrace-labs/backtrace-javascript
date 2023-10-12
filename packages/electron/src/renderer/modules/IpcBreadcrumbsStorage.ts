import { BacktraceAttachment, BreadcrumbsStorage, RawBreadcrumb } from '@backtrace-labs/sdk-core';
import { IpcTransport } from '../../common';
import { IpcEvents } from '../../common/ipc/IpcEvents';

export class IpcBreadcrumbsStorage implements BreadcrumbsStorage {
    constructor(private readonly _ipcTransport: IpcTransport) {}

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
