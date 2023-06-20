import { BacktraceAttachment, BacktraceConfiguration as CoreConfiguration } from '@backtrace/sdk-core';

export interface BacktraceConfiguration extends CoreConfiguration {
    /**
     * Application name
     */
    readonly name: string;

    /**
     * Application version
     */
    readonly version: string;

    attachments: BacktraceAttachment<Blob | string>[];
}
