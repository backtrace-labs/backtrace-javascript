import { BacktraceAttachment, BacktraceConfiguration as CoreConfiguration } from '@backtrace-labs/sdk-core';

export interface BacktraceConfiguration extends CoreConfiguration {
    /**
     * Application name
     */
    readonly name: string;

    /**
     * Application version
     */
    readonly version: string;

    /**
     * Attachments are additional files/data that can be send with error to Backtrace.
     */
    attachments?: BacktraceAttachment<Blob | string>[];
}
