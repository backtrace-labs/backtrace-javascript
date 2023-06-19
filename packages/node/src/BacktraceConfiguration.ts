import { BacktraceAttachment, BacktraceConfiguration as CoreConfiguration } from '@backtrace/sdk-core';

export interface BacktraceConfiguration extends Omit<CoreConfiguration, 'attachments'> {
    attachments?: Array<BacktraceAttachment<Buffer> | string>;
}
