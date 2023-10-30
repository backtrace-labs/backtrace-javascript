import { BacktraceAttachment, BacktraceConfiguration as CoreConfiguration } from '@backtrace/sdk-core';
import { Readable } from 'stream';

export interface BacktraceSetupConfiguration extends Omit<CoreConfiguration, 'attachments'> {
    attachments?: Array<BacktraceAttachment<Buffer | Readable | string | Uint8Array> | string>;
}

export interface BacktraceConfiguration extends Omit<CoreConfiguration, 'attachments'> {
    attachments?: BacktraceAttachment<Buffer | Readable | string | Uint8Array>[];
}
